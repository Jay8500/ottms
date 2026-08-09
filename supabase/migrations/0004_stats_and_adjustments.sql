-- ════════════════════════════════════════════════════════════════════════
--  0004 — derived user stats, and audited admin balance corrections
-- ════════════════════════════════════════════════════════════════════════

-- ── User stats ──────────────────────────────────────────────────────────
-- Ratings, badge count and activity counters, computed rather than stored.
-- No trigger to keep in sync and no second copy of the truth to drift.
create or replace view user_stats as
select
  p.id as user_id,
  coalesce(r.rating_avg, 0)::numeric(3,2) as rating_avg,
  coalesce(r.review_count, 0)             as review_count,
  coalesce(b.badge_count, 0)              as badge_count,
  coalesce(j.groups_joined, 0)            as groups_joined,
  coalesce(c.groups_created, 0)           as groups_created,
  coalesce(t.tx_count, 0)                 as tx_count
from profiles p
left join (
  select rated_user_id, avg(stars) as rating_avg, count(*) as review_count
    from ratings group by rated_user_id
) r on r.rated_user_id = p.id
left join (
  select user_id, count(*) as badge_count from badge_awards group by user_id
) b on b.user_id = p.id
left join (
  select buyer_id, count(*) as groups_joined from group_members group by buyer_id
) j on j.buyer_id = p.id
left join (
  select seller_id, count(*) as groups_created from groups group by seller_id
) c on c.seller_id = p.id
left join (
  select user_id, count(*) as tx_count from wallet_transactions group by user_id
) t on t.user_id = p.id;

comment on view user_stats is
  'Derived reputation and activity counters. Read-only; the underlying tables are the source.';

-- A view runs with the caller's privileges under this setting, so the RLS
-- policies on the underlying tables still apply.
alter view user_stats set (security_invoker = true);

grant select on user_stats to authenticated;

-- ── Audited balance correction ──────────────────────────────────────────
-- The admin Wallet screen edits balances directly. Routing it through here
-- means a manual correction leaves the same trail as a purchase — who did
-- it, when, and why.
create or replace function adjust_balance(
  p_user     uuid,
  p_locked   numeric,
  p_unlocked numeric,
  p_reason   text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cur_locked   numeric(12,2);
  v_cur_unlocked numeric(12,2);
  v_d_locked     numeric(12,2);
  v_d_unlocked   numeric(12,2);
  v_tx           uuid;
begin
  if not is_admin() then
    raise exception 'Admins only';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required for a manual balance change';
  end if;
  if p_locked < 0 or p_unlocked < 0 then
    raise exception 'Balances cannot be negative';
  end if;

  select wallet_locked, wallet_unlocked
    into v_cur_locked, v_cur_unlocked
    from profiles where id = p_user for update;

  if not found then
    raise exception 'No such user';
  end if;

  v_d_locked   := p_locked   - v_cur_locked;
  v_d_unlocked := p_unlocked - v_cur_unlocked;

  if v_d_locked = 0 and v_d_unlocked = 0 then
    return;   -- nothing changed, do not write a noise entry
  end if;

  -- Record it as a transaction too, so it shows in the user's history
  -- rather than money appearing from nowhere.
  insert into wallet_transactions
    (user_id, tx_type, tx_kind, status, amount, reject_reason, decided_by, decided_at)
  values (
    p_user,
    case when v_d_locked + v_d_unlocked >= 0 then 'funded' else 'expense' end,
    'addfund',
    'cleared',
    abs(v_d_locked + v_d_unlocked),
    'Admin adjustment: ' || p_reason,
    auth.uid(),
    now()
  )
  returning id into v_tx;

  perform post_ledger(p_user, v_d_locked, v_d_unlocked,
                      'Admin adjustment: ' || p_reason, v_tx);
end $$;

grant execute on function adjust_balance(uuid, numeric, numeric, text) to authenticated;

-- Balances may no longer be written straight from the client; the RPC above
-- is the only route. Everything else on profiles stays editable by admin.
drop policy if exists profiles_admin on profiles;

create policy profiles_admin_read on profiles for select to authenticated
  using (is_admin());
create policy profiles_admin_write on profiles for update to authenticated
  using (is_admin())
  with check (
    is_admin()
    and wallet_locked   = (select wallet_locked   from profiles p2 where p2.id = profiles.id)
    and wallet_unlocked = (select wallet_unlocked from profiles p2 where p2.id = profiles.id)
  );
create policy profiles_admin_insert on profiles for insert to authenticated
  with check (is_admin());
create policy profiles_admin_delete on profiles for delete to authenticated
  using (is_admin());