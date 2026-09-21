-- ════════════════════════════════════════════════════════════════════════
--  0031 — make "Remove Account" (User's Data) actually do something
--
--  Reported as "Items design overlapping, not working" under User's Data —
--  the overlap turned out to already be fixed by the badge/joined-groups
--  data corrections earlier this round (those screens were rendering
--  near-random data, which is what looked broken). But while checking this
--  screen, removeUser() in usermngmnt.page.ts turned out to be a real
--  "not working" bug of its own: it only filtered the user out of the
--  in-memory list. Nothing was sent to the server, so the account was
--  still fully live — the row reappears on the next refresh.
--
--  A real account delete needs auth.admin.deleteUser(), which only works
--  with the service-role key from a server context (an Edge Function) —
--  not available to a plain client-side RPC. Rather than leave the button
--  fake, or build unreviewed server-key infrastructure blind, this adds a
--  reversible soft-disable: admin_disable_user() marks the row disabled
--  (blocking sign-in at the app layer) after enforcing, server-side, the
--  same conditions the confirm dialog already states in words — wallet
--  settled, no listing or membership left open. A real hard-delete Edge
--  Function is a separate, larger decision and is not this migration.
-- ════════════════════════════════════════════════════════════════════════

alter table profiles add column is_disabled boolean not null default false;

comment on column profiles.is_disabled is
  'Soft "removed" flag set by admin_disable_user(). Blocks sign-in at the
   app layer (auth.ts loadProfile). Not an auth.users ban — that needs the
   service-role key from a server context, which this project does not
   have wired up yet.';

create or replace function admin_disable_user(p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_locked   numeric;
  v_unlocked numeric;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  select wallet_locked, wallet_unlocked into v_locked, v_unlocked
    from profiles where id = p_user for update;
  if not found then raise exception 'User not found'; end if;

  if v_locked > 0 or v_unlocked > 0 then
    raise exception 'Wallet balance of this user must be settled first';
  end if;

  if exists (
    select 1 from groups
     where seller_id = p_user and status in ('pending', 'approved', 'full')
  ) then
    raise exception 'This user has an active group listing — resolve it first';
  end if;

  if exists (
    select 1 from group_members
     where buyer_id = p_user and status = 'active'
  ) then
    raise exception 'This user has an active membership — resolve it first';
  end if;

  update profiles set is_disabled = true where id = p_user;
end $$;
