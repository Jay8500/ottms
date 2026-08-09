-- ════════════════════════════════════════════════════════════════════════
--  Money functions
--
--  Every balance change goes through here. Each function is one transaction,
--  so a purchase either completes in full or not at all — the client can
--  never leave the books half-written, and can never post its own amounts.
--
--  All rates come from app_settings. The client's questionnaire answers are
--  UPDATEs to that table, not edits to this file.
-- ════════════════════════════════════════════════════════════════════════

-- ── Setting readers ─────────────────────────────────────────────────────
create or replace function setting_num(k text) returns numeric
language sql stable security definer set search_path = public as $$
  select (value #>> '{}')::numeric from app_settings where key = k;
$$;

create or replace function setting_text(k text) returns text
language sql stable security definer set search_path = public as $$
  select value #>> '{}' from app_settings where key = k;
$$;

create or replace function admin_user_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from profiles where role = 'admin' order by created_at limit 1;
$$;

-- ── Ledger primitive ────────────────────────────────────────────────────
-- The ONLY thing that moves a balance. Writes the audit row and the
-- denormalised totals together so they cannot drift.
create or replace function post_ledger(
  p_user uuid,
  p_locked numeric,
  p_unlocked numeric,
  p_reason text,
  p_tx uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles
     set wallet_locked   = wallet_locked   + p_locked,
         wallet_unlocked = wallet_unlocked + p_unlocked
   where id = p_user;

  if not found then
    raise exception 'No such user: %', p_user;
  end if;

  -- The CHECK constraints on profiles reject a negative balance, so an
  -- overdraw fails here and rolls the whole transaction back.
  insert into wallet_ledger (user_id, transaction_id, locked_delta, unlocked_delta, reason)
  values (p_user, p_tx, p_locked, p_unlocked, p_reason);
end $$;

-- ── Bank details: write once ────────────────────────────────────────────
create or replace function forbid_bank_edit() returns trigger
language plpgsql as $$
begin
  if old.locked and not is_admin() then
    raise exception 'Bank details are set once at sign-up and cannot be changed';
  end if;
  return new;
end $$;

create trigger bank_details_immutable
  before update on bank_details
  for each row execute function forbid_bank_edit();

-- ════════════════════════════════════════════════════════════════════════
--  PURCHASE
-- ════════════════════════════════════════════════════════════════════════
create or replace function purchase_screen(p_group uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_buyer      uuid := auth.uid();
  v_group      groups%rowtype;
  v_seats_used integer;
  v_price      numeric(12,2);
  v_fee_pct    numeric;
  v_fee        numeric(12,2);
  v_payer      text;
  v_debit      numeric(12,2);
  v_credit     numeric(12,2);
  v_admin      uuid;
  v_member     uuid;
  v_tx_buy     uuid;
  v_expires    date;
begin
  if v_buyer is null then
    raise exception 'Not signed in';
  end if;

  -- Lock the group row so two buyers cannot take the last seat at once.
  select * into v_group from groups where id = p_group for update;
  if not found then raise exception 'Group not found'; end if;

  if v_group.status not in ('approved') then
    raise exception 'This group is not open for joining';
  end if;
  if v_group.seller_id = v_buyer then
    raise exception 'You cannot join your own group';
  end if;

  select count(*) into v_seats_used
    from group_members
   where group_id = p_group and status in ('active','expiring');

  if v_seats_used >= v_group.seats_total then
    raise exception 'This group is full';
  end if;

  if exists (select 1 from group_members
              where group_id = p_group and buyer_id = v_buyer
                and status in ('active','expiring')) then
    raise exception 'You are already in this group';
  end if;

  v_price   := v_group.price;
  v_fee_pct := coalesce(setting_num('service_charge_pct'), 0);
  v_payer   := coalesce(setting_text('service_charge_payer'), 'buyer');
  v_fee     := round(v_price * v_fee_pct / 100, 2);

  if v_payer = 'buyer' then
    v_debit  := v_price + v_fee;
    v_credit := v_price;
  else
    v_debit  := v_price;
    v_credit := v_price - v_fee;
  end if;

  -- Spendable balance only; locked funds are not available to spend.
  if (select wallet_unlocked from profiles where id = v_buyer) < v_debit then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  v_expires := current_date + (v_group.months || ' months')::interval;

  insert into group_members (group_id, buyer_id, joined_on, expires_on, amount_paid, seller_credit)
  values (p_group, v_buyer, current_date, v_expires, v_debit, v_credit)
  returning id into v_member;

  -- Buyer pays
  insert into wallet_transactions
    (user_id, tx_type, tx_kind, status, amount, group_id, group_member_id, counterparty_id)
  values
    (v_buyer, 'expense', 'purchase', 'cleared', v_debit, p_group, v_member, v_group.seller_id)
  returning id into v_tx_buy;

  perform post_ledger(v_buyer, 0, -v_debit, 'Purchase', v_tx_buy);

  -- Seller is credited to LOCKED, released daily across the validity period
  insert into wallet_transactions
    (user_id, tx_type, tx_kind, status, amount, group_id, group_member_id, counterparty_id)
  values
    (v_group.seller_id, 'funded', 'sale', 'cleared', v_credit, p_group, v_member, v_buyer);

  perform post_ledger(v_group.seller_id, v_credit, 0, 'Sale — held until validity elapses');

  -- Admin takes the service charge immediately, as spendable
  if v_fee > 0 then
    v_admin := admin_user_id();
    if v_admin is not null then
      insert into wallet_transactions
        (user_id, tx_type, tx_kind, status, amount, group_id, group_member_id, counterparty_id)
      values
        (v_admin, 'funded', 'service_fee', 'cleared', v_fee, p_group, v_member, v_buyer);
      perform post_ledger(v_admin, 0, v_fee, 'Service charge');
    end if;
  end if;

  -- Close the group once the last seat goes
  if v_seats_used + 1 >= v_group.seats_total then
    update groups set status = 'full' where id = p_group;
  end if;

  -- Open the buyer↔seller thread
  insert into chat_threads (group_id, buyer_id, seller_id, last_message, last_at)
  values (p_group, v_buyer, v_group.seller_id, 'Group joined', now())
  on conflict (group_id, buyer_id) do nothing;

  return v_member;
end $$;

-- ════════════════════════════════════════════════════════════════════════
--  ADD FUND  (user requests → admin approves)
-- ════════════════════════════════════════════════════════════════════════
create or replace function approve_add_fund(p_tx uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_tx wallet_transactions%rowtype;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  select * into v_tx from wallet_transactions where id = p_tx for update;
  if not found then raise exception 'Request not found'; end if;
  if v_tx.tx_kind <> 'addfund' then raise exception 'Not an add-fund request'; end if;
  if v_tx.status <> 'pending' then raise exception 'Already %', v_tx.status; end if;

  update wallet_transactions
     set status = 'cleared', decided_by = auth.uid(), decided_at = now()
   where id = p_tx;

  perform post_ledger(v_tx.user_id, 0, v_tx.amount, 'Funds added', p_tx);
end $$;

-- ════════════════════════════════════════════════════════════════════════
--  WITHDRAW
-- ════════════════════════════════════════════════════════════════════════
-- Funds are held the moment the request is raised, so the same balance
-- cannot be withdrawn twice or spent while a payout is pending.
create or replace function request_withdraw(p_amount numeric, p_payment_app text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_min  numeric := coalesce(setting_num('withdraw_min'), 0);
  v_tx   uuid;
begin
  if v_user is null then raise exception 'Not signed in'; end if;
  if p_amount <= 0 then raise exception 'Enter an amount above zero'; end if;
  if p_amount < v_min then
    raise exception 'Minimum withdrawal is ₹%', v_min;
  end if;
  if (select wallet_unlocked from profiles where id = v_user) < p_amount then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;
  if not exists (select 1 from bank_details where user_id = v_user) then
    raise exception 'Add your bank or UPI details before withdrawing';
  end if;

  insert into wallet_transactions (user_id, tx_type, tx_kind, status, amount, payment_app)
  values (v_user, 'expense', 'withdraw', 'pending', p_amount, p_payment_app)
  returning id into v_tx;

  -- move out of spendable into held while admin processes it
  perform post_ledger(v_user, p_amount, -p_amount, 'Withdrawal requested — held', v_tx);
  return v_tx;
end $$;

create or replace function approve_withdraw(p_tx uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tx      wallet_transactions%rowtype;
  v_fee_pct numeric := coalesce(setting_num('withdraw_fee_pct'), 0);
  v_fee     numeric(12,2);
  v_admin   uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  select * into v_tx from wallet_transactions where id = p_tx for update;
  if not found then raise exception 'Request not found'; end if;
  if v_tx.tx_kind <> 'withdraw' then raise exception 'Not a withdrawal'; end if;
  if v_tx.status <> 'pending' then raise exception 'Already %', v_tx.status; end if;

  v_fee := round(v_tx.amount * v_fee_pct / 100, 2);

  update wallet_transactions
     set status = 'cleared', decided_by = auth.uid(), decided_at = now()
   where id = p_tx;

  -- release the hold; the user has been paid outside the app
  perform post_ledger(v_tx.user_id, -v_tx.amount, 0, 'Withdrawal paid', p_tx);

  if v_fee > 0 then
    v_admin := admin_user_id();
    if v_admin is not null then
      insert into wallet_transactions (user_id, tx_type, tx_kind, status, amount, counterparty_id)
      values (v_admin, 'funded', 'service_fee', 'cleared', v_fee, v_tx.user_id);
      perform post_ledger(v_admin, 0, v_fee, 'Withdrawal fee');
    end if;
  end if;
end $$;

create or replace function reject_withdraw(p_tx uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_tx wallet_transactions%rowtype;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  select * into v_tx from wallet_transactions where id = p_tx for update;
  if not found then raise exception 'Request not found'; end if;
  if v_tx.status <> 'pending' then raise exception 'Already %', v_tx.status; end if;

  update wallet_transactions
     set status = 'rejected', reject_reason = p_reason,
         decided_by = auth.uid(), decided_at = now()
   where id = p_tx;

  -- give the held money back
  perform post_ledger(v_tx.user_id, -v_tx.amount, v_tx.amount, 'Withdrawal rejected — released', p_tx);
end $$;

create or replace function reject_add_fund(p_tx uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update wallet_transactions
     set status = 'rejected', reject_reason = p_reason,
         decided_by = auth.uid(), decided_at = now()
   where id = p_tx and status = 'pending' and tx_kind = 'addfund';
  if not found then raise exception 'Request not found or already decided'; end if;
  -- nothing was credited, so no ledger entry is needed
end $$;

-- ════════════════════════════════════════════════════════════════════════
--  DAILY UNLOCK  (schedule with pg_cron, once a day)
--  Releases the seller's held funds pro-rata across each buyer's period.
-- ════════════════════════════════════════════════════════════════════════
create or replace function settle_daily_unlock()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  m         record;
  v_total   integer;
  v_elapsed integer;
  v_due     numeric(12,2);
  v_step    numeric(12,2);
  v_count   integer := 0;
begin
  for m in
    select gm.*, g.seller_id
      from group_members gm
      join groups g on g.id = gm.group_id
     where gm.status in ('active','expiring')
       and gm.released < gm.seller_credit
  loop
    v_total   := greatest(1, m.expires_on - m.joined_on);
    v_elapsed := least(v_total, greatest(0, current_date - m.joined_on));

    -- straight-line release; the final day settles any rounding remainder
    v_due  := round(m.seller_credit * v_elapsed / v_total, 2);
    if v_elapsed >= v_total then v_due := m.seller_credit; end if;
    v_step := v_due - m.released;

    if v_step > 0 then
      perform post_ledger(m.seller_id, -v_step, v_step, 'Daily unlock');
      update group_members set released = v_due where id = m.id;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end $$;

create or replace function expire_memberships()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with done as (
    update group_members
       set status = 'expired'
     where status in ('active','expiring') and expires_on <= current_date
     returning group_id
  )
  select count(*) into v_count from done;

  -- a freed seat puts the seller back in the sellers list
  update groups g set status = 'approved'
   where g.status = 'full'
     and (select count(*) from group_members m
           where m.group_id = g.id and m.status in ('active','expiring')) < g.seats_total;

  return v_count;
end $$;

-- ════════════════════════════════════════════════════════════════════════
--  EXIT / REFUND
--  Personal reason  → buyer gets a share of the unused amount, the rest is
--                     split between seller and admin.
--  Faulty account   → buyer gets it all back, seller takes a penalty.
--  All four percentages come from app_settings.
-- ════════════════════════════════════════════════════════════════════════
create or replace function exit_membership(
  p_member uuid,
  p_reason exit_reason,
  p_proof_url text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  m            group_members%rowtype;
  v_seller     uuid;
  v_total      integer;
  v_left       integer;
  v_unused     numeric(12,2);
  v_held       numeric(12,2);
  v_refund     numeric(12,2);
  v_seller_cut numeric(12,2);
  v_admin_cut  numeric(12,2);
  v_penalty    numeric(12,2);
  v_base       numeric(12,2);
  v_admin      uuid := admin_user_id();
begin
  select * into m from group_members where id = p_member for update;
  if not found then raise exception 'Membership not found'; end if;

  select seller_id into v_seller from groups where id = m.group_id;

  if m.buyer_id <> auth.uid() and not is_admin() then
    raise exception 'Not your membership';
  end if;
  if m.status not in ('active','expiring') then
    raise exception 'This membership is already %', m.status;
  end if;
  if p_reason = 'faulty' and p_proof_url is null then
    raise exception 'A photo of the problem is required for a faulty-account claim';
  end if;

  v_total  := greatest(1, m.expires_on - m.joined_on);
  v_left   := greatest(0, m.expires_on - current_date);
  v_unused := round(m.amount_paid * v_left / v_total, 2);

  -- what of the seller's payout is still held for this seat
  v_held := greatest(0, m.seller_credit - m.released);

  if p_reason = 'personal' then
    v_refund     := round(v_unused * coalesce(setting_num('exit_personal_refund_pct'), 50) / 100, 2);
    v_seller_cut := round(v_unused * coalesce(setting_num('exit_personal_seller_pct'), 25) / 100, 2);
    -- admin takes the remainder so rounding never creates or destroys rupees
    v_admin_cut  := v_unused - v_refund - v_seller_cut;
  else
    v_refund     := round(v_unused * coalesce(setting_num('exit_faulty_refund_pct'), 100) / 100, 2);
    v_seller_cut := 0;
    v_admin_cut  := 0;
  end if;

  -- The refund is funded from the seller's held balance. If the hold is
  -- already smaller than what is owed (most of the period elapsed), we can
  -- only claw back what is actually still held.
  v_refund     := least(v_refund, v_held);
  v_seller_cut := least(v_seller_cut, greatest(0, v_held - v_refund));
  v_admin_cut  := greatest(0, v_held - v_refund - v_seller_cut);

  if v_refund > 0 then
    perform post_ledger(v_seller, -v_refund, 0, 'Refund to buyer on exit');
    perform post_ledger(m.buyer_id, 0, v_refund, 'Refund — ' || p_reason || ' exit');

    insert into wallet_transactions
      (user_id, tx_type, tx_kind, status, amount, group_id, group_member_id, counterparty_id)
    values
      (m.buyer_id, 'funded', 'refund', 'cleared', v_refund, m.group_id, p_member, v_seller);
  end if;

  if v_seller_cut > 0 then
    perform post_ledger(v_seller, -v_seller_cut, v_seller_cut, 'Retained on buyer exit');
  end if;

  if v_admin_cut > 0 and v_admin is not null then
    perform post_ledger(v_seller, -v_admin_cut, 0, 'Admin share of exit');
    perform post_ledger(v_admin, 0, v_admin_cut, 'Admin share of exit');
  end if;

  -- Faulty account: penalise the seller on top
  if p_reason = 'faulty' then
    v_base := case coalesce(setting_text('faulty_penalty_base'), 'sale_price')
                when 'sale_price'     then m.amount_paid
                when 'unused_portion' then v_unused
                else (select wallet_unlocked from profiles where id = v_seller)
              end;
    v_penalty := round(v_base * coalesce(setting_num('faulty_penalty_pct'), 10) / 100, 2);
    v_penalty := least(v_penalty, (select wallet_unlocked from profiles where id = v_seller));

    if v_penalty > 0 then
      perform post_ledger(v_seller, 0, -v_penalty, 'Faulty account penalty');
      insert into wallet_transactions (user_id, tx_type, tx_kind, status, amount, group_member_id)
      values (v_seller, 'expense', 'penalty', 'cleared', v_penalty, p_member);

      if v_admin is not null then
        perform post_ledger(v_admin, 0, v_penalty, 'Penalty collected');
      end if;
    end if;
  end if;

  update group_members
     set status = 'exited', exited_at = now(),
         exit_reason = p_reason, exit_proof_url = p_proof_url
   where id = p_member;

  -- seat is free again
  update groups g set status = 'approved'
   where g.id = m.group_id and g.status = 'full';
end $$;

-- ════════════════════════════════════════════════════════════════════════
--  GRANTS — the client may only call these, never write balances directly
-- ════════════════════════════════════════════════════════════════════════
revoke all on function post_ledger(uuid, numeric, numeric, text, uuid) from public, authenticated;

grant execute on function purchase_screen(uuid)                     to authenticated;
grant execute on function request_withdraw(numeric, text)           to authenticated;
grant execute on function exit_membership(uuid, exit_reason, text)  to authenticated;
grant execute on function approve_add_fund(uuid)                    to authenticated;
grant execute on function reject_add_fund(uuid, text)               to authenticated;
grant execute on function approve_withdraw(uuid)                    to authenticated;
grant execute on function reject_withdraw(uuid, text)               to authenticated;
grant execute on function setting_num(text)                         to authenticated;
grant execute on function setting_text(text)                        to authenticated;