-- ════════════════════════════════════════════════════════════════════════
--  0007 — fix adjust_balance() enum cast
--
--  `case when … then 'funded' else 'expense' end` resolves to text, and text
--  does not implicitly cast to the tx_type enum. The neighbouring literals
--  ('addfund', 'cleared') worked because a bare literal is type `unknown`,
--  which Postgres coerces to the target column type — a CASE result is not.
--  Explicit ::tx_type cast added.
-- ════════════════════════════════════════════════════════════════════════

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
  v_net          numeric(12,2);
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
  v_net        := v_d_locked + v_d_unlocked;

  if v_d_locked = 0 and v_d_unlocked = 0 then
    return;   -- nothing changed, do not write a noise entry
  end if;

  insert into wallet_transactions
    (user_id, tx_type, tx_kind, status, amount, reject_reason, decided_by, decided_at)
  values (
    p_user,
    (case when v_net >= 0 then 'funded' else 'expense' end)::tx_type,
    'addfund'::tx_kind,
    'cleared'::tx_status,
    abs(v_net),
    'Admin adjustment: ' || p_reason,
    auth.uid(),
    now()
  )
  returning id into v_tx;

  perform post_ledger(p_user, v_d_locked, v_d_unlocked,
                      'Admin adjustment: ' || p_reason, v_tx);
end $$;