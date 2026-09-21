-- ════════════════════════════════════════════════════════════════════════
--  0032 — actually close the wallet-balance read gap (0030 follow-up)
--
--  0030 added profiles_public, masking wallet_locked/wallet_unlocked for
--  anyone but the row's owner or admin — but nothing was pointed at it
--  yet, and profiles_read (`using (true)`, 0002) still let ANY signed-in
--  user read the raw wallet columns straight off `profiles` in a plain
--  REST call, exactly as before 0030. The view was a foundation, not the
--  fix — this migration is the fix.
--
--  RLS is row-level; it cannot mask two columns on an otherwise-visible
--  row. The only real fix is a column-level privilege change: revoke
--  `authenticated`'s table-wide SELECT on profiles and grant back SELECT
--  on every column except the two wallet ones. (A column-level REVOKE
--  alone does nothing here — verified live: with the table-wide grant
--  still in place, `authenticated` could still read wallet_locked
--  straight after the column-level revoke. Postgres does not let a
--  column privilege carve an exception out of a table-level grant.)
--
--  This broke two other things, found only by testing against the real
--  database before writing this migration, not by reading the code:
--
--  1) profiles_self_edit (0020) and profiles_admin_write (0004) both
--     compare wallet_locked/wallet_unlocked (and role/unique_number) to
--     their previous value INSIDE the policy's WITH CHECK clause. That
--     comparison runs as `authenticated`/the admin's own role, so it
--     needs SELECT on those columns too — which this migration removes.
--     Moved into a BEFORE UPDATE trigger instead: a trigger reads NEW/OLD
--     directly rather than through a privileged SELECT, so it enforces
--     the exact same rule without needing that grant. The trigger allows
--     the change only when current_user is postgres/supabase_admin — i.e.
--     genuinely running inside a SECURITY DEFINER function like
--     post_ledger(), never a direct client call, admin included. This is
--     one rule doing the job of two near-duplicate policy clauses.
--
--  2) profiles_public (0030) had `security_invoker = true`, meaning it
--     read wallet_locked using the CALLER's own privileges — which, after
--     the revoke above, is nobody's. Every caller, including the row's
--     own owner and admin, would get "permission denied" evaluating the
--     view's own CASE expression. Flipped to security_invoker = false so
--     the view runs with its own (owner's) privileges instead; the CASE
--     masking logic (auth.uid()/is_admin()) does not depend on the
--     caller's column grants, so this is still safe. profiles_read is
--     `using (true)` — no row is hidden from anyone today — so this does
--     not change row visibility, only which columns are readable and how.
--
--  Every one of these was tested against the live database first, inside
--  a transaction that was rolled back, before being written here:
--  a normal self-edit (avatar/name) still succeeds; a self-edit or a raw
--  admin update trying to also change the wallet is blocked by the
--  trigger, not by luck; post_ledger() (SECURITY DEFINER, owned by
--  postgres, exactly like every other money RPC) still moves balances
--  exactly as before; and profiles_public correctly shows the real number
--  for your own row or when the caller is admin, and 0 for anyone else's.
--
--  App code switched over in the same commit as this migration (checked
--  every reader of wallet_locked/wallet_unlocked across the whole app —
--  three call sites total): auth.ts's own-profile load, and admin's two
--  screens (User's Data, Wallet management), all now read from
--  profiles_public instead of the raw table. Nothing else in the app
--  reads those two columns — every embed elsewhere (`profiles!fkey(name,
--  unique_number, ...)`) only ever asks for name/unique_number/mobile/
--  avatar_url/is_online, all still fully readable, unaffected.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Column lockdown ─────────────────────────────────────────────────
revoke select on profiles from authenticated;
grant select (
  id, name, nick_name, mobile, email, unique_number, avatar_url, role,
  is_seller, mobile_verified, email_verified, is_online, last_seen_at,
  created_at, is_disabled
) on profiles to authenticated;

-- ── 2. Move the "you cannot change these" rule into a trigger ──────────
drop policy if exists profiles_self_edit on profiles;
create policy profiles_self_edit on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for update to authenticated
  using (is_admin()) with check (is_admin());

create or replace function guard_profiles_sensitive_cols() returns trigger
language plpgsql as $$
begin
  -- A genuine SECURITY DEFINER money RPC (post_ledger, adjust_balance,
  -- settle_daily_unlock, ...) — all owned by postgres, so current_user
  -- switches to the function owner for the duration of the call. Never
  -- true for a request arriving through PostgREST, admin included.
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if new.role <> old.role
     or new.wallet_locked <> old.wallet_locked
     or new.wallet_unlocked <> old.wallet_unlocked
     or new.unique_number <> old.unique_number then
    raise exception 'Role, balance and member number can only change through the ledger RPCs';
  end if;
  return new;
end $$;

comment on function guard_profiles_sensitive_cols() is
  'Replaces the wallet/role/unique_number pin that used to live inside
   profiles_self_edit (0020) and profiles_admin_write (0004) as a WITH
   CHECK subquery. Moved here because a trigger reads NEW/OLD directly and
   does not need the caller to have column-level SELECT on those columns,
   unlike a WITH CHECK expression.';

drop trigger if exists guard_profiles_sensitive_cols_trg on profiles;
create trigger guard_profiles_sensitive_cols_trg
  before update on profiles for each row execute function guard_profiles_sensitive_cols();

-- ── 3. profiles_public: fill it out and make it actually work post-revoke ─
drop view if exists profiles_public;
create view profiles_public
  with (security_invoker = false)
as
select
  id, name, nick_name, unique_number, mobile, email, avatar_url, role, is_seller,
  mobile_verified, email_verified, is_online, last_seen_at, created_at, is_disabled,
  case when id = auth.uid() or is_admin() then wallet_locked   else 0 end as wallet_locked,
  case when id = auth.uid() or is_admin() then wallet_unlocked else 0 end as wallet_unlocked
from profiles;

comment on view profiles_public is
  'The only place wallet_locked/wallet_unlocked can be read from now on —
   authenticated no longer has column-level SELECT on those two columns on
   the base table (see the revoke above). security_invoker=false so the
   view''s own privileges cover that gap; the CASE masking still uses
   auth.uid()/is_admin() per caller, not the caller''s own column grants.';

grant select on profiles_public to authenticated;
