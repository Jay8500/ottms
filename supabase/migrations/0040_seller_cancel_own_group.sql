-- ════════════════════════════════════════════════════════════════════════
--  0040 — a seller can withdraw their own listing early
--
--  Found by QA trace (SEL-10): a seller had no way to pull their own group
--  before anyone approves/joins it — no button, no RPC. groups_seller_update
--  (0002) only allows a direct update while status='pending' anyway, so an
--  'approved'/'full' listing with zero buyers still needs a function.
--
--  Deliberately narrow: only while NO buyer has joined yet (no active or
--  expiring group_members). Once even one buyer is in, cancelling becomes a
--  refund decision — same reasoning 0011 already applied to faulty exits —
--  so that case is refused here with a clear message, not half-handled.
-- ════════════════════════════════════════════════════════════════════════

create or replace function cancel_own_group(p_group uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_group groups%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select * into v_group from groups where id = p_group for update;
  if not found then raise exception 'Group not found'; end if;
  if v_group.seller_id <> auth.uid() then raise exception 'Not your listing'; end if;
  if v_group.status not in ('pending', 'approved', 'full') then
    raise exception 'This listing cannot be cancelled anymore';
  end if;

  if exists (
    select 1 from group_members
     where group_id = p_group and status in ('active', 'expiring')
  ) then
    raise exception
      'Buyers have already joined this group — contact support instead of cancelling it yourself';
  end if;

  update groups set status = 'cancelled' where id = p_group;
end $$;

grant execute on function cancel_own_group(uuid) to authenticated;
