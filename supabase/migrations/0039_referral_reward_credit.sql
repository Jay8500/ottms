-- ════════════════════════════════════════════════════════════════════════
--  0039 — actually credit the referral reward
--
--  See 0038 for why. This is 0021's purchase_screen() unchanged, plus one
--  new step at the end: on the referred buyer's FIRST successful purchase
--  (counting group_members rows for them, this one included), find their
--  still-unrewarded referral row and credit the referrer — matching the
--  Refer a Friend screen's own promise ("when they make their first
--  purchase, you get ₹X"). Needs 0038's new 'referral' enum value, which
--  must already be committed — hence the separate migration.
--
--  Deliberately not retroactive: a referred user who already made their
--  first purchase before this shipped does not get swept up and credited
--  after the fact — that is a real money decision for the client to make
--  explicitly, not something to backfill silently in a bugfix.
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
  v_ref        referrals%rowtype;
  v_tx_ref     uuid;
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

  if v_fee > 0 then
    v_admin := admin_user_id();
    if v_admin is null then
      raise exception
        'Purchases are paused — no admin account is set up to receive the service charge';
    end if;
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

  -- Admin takes the service charge immediately, as spendable. v_admin is
  -- guaranteed to be set above whenever v_fee > 0.
  if v_fee > 0 then
    insert into wallet_transactions
      (user_id, tx_type, tx_kind, status, amount, group_id, group_member_id, counterparty_id)
    values
      (v_admin, 'funded', 'service_fee', 'cleared', v_fee, p_group, v_member, v_buyer);
    perform post_ledger(v_admin, 0, v_fee, 'Service charge');
  end if;

  -- Referral reward: only on this buyer's first-ever purchase, and only
  -- once per referral row (rewarded stays false until this fires).
  if (select count(*) from group_members where buyer_id = v_buyer) = 1 then
    select * into v_ref from referrals
     where referred_id = v_buyer and not rewarded
     for update;

    if found and v_ref.reward_amount > 0 then
      insert into wallet_transactions
        (user_id, tx_type, tx_kind, status, amount, counterparty_id)
      values
        (v_ref.referrer_id, 'funded', 'referral', 'cleared', v_ref.reward_amount, v_buyer)
      returning id into v_tx_ref;

      perform post_ledger(v_ref.referrer_id, 0, v_ref.reward_amount, 'Referral reward', v_tx_ref);

      update referrals set rewarded = true where id = v_ref.id;
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

-- create or replace keeps existing grants, but be explicit.
grant execute on function purchase_screen(uuid) to authenticated;
