-- ════════════════════════════════════════════════════════════════════════
--  MONEY SMOKE TEST
--
--  Exercises every rupee-moving path and checks the arithmetic, without the
--  app and without two phones.
--
--  HOW TO RUN
--    Paste this whole file into the SQL Editor and run it. It creates a
--    helper function, then calls it. The call returns a table of results —
--    verdict first, then one row per check.
--
--    To run it again later, you only need:  select * from money_smoke_test();
--
--  WHY IT IS SAFE ON THE LIVE DATABASE
--    Every change the test makes happens inside a PL/pgSQL subtransaction
--    that is deliberately aborted before the function returns. Test users,
--    test groups and test money are all undone. The results survive the
--    abort because PL/pgSQL variables are not transactional — only database
--    changes are rolled back.
--
--    That is why this is one statement rather than begin/…/rollback: it does
--    not depend on the SQL Editor keeping a transaction open across
--    statements, which is what broke the earlier version.
-- ════════════════════════════════════════════════════════════════════════

create or replace function money_smoke_test()
returns table (seq int, step text, outcome text, detail text)
language plpgsql
as $fn$
declare
  res jsonb := '[]'::jsonb;

  v_seller uuid := gen_random_uuid();
  v_buyer  uuid := gen_random_uuid();
  -- A second buyer, because group_members is unique on (group_id, buyer_id)
  -- and the first buyer has already used their slot in this group.
  v_buyer2 uuid := gen_random_uuid();
  v_admin  uuid;
  v_app    uuid;
  v_tier   uuid;
  v_group  uuid;
  v_member uuid;
  v_tx     uuid;

  v_price        numeric := 400;
  v_fee_pct      numeric;
  v_expect_fee   numeric;
  v_expect_debit numeric;

  v_buyer_unlocked numeric;
  v_seller_locked  numeric;
  v_seller_spend   numeric;
  v_admin_before   numeric;
  v_admin_after    numeric;
  v_released       numeric;
  v_refund         numeric;

  -- second membership, used for the faulty-account path
  v_member2 uuid;
  v_req     uuid;
  v_s_before numeric;
  v_b_before numeric;
  v_a_before numeric;
  v_s_after  numeric;
  v_b_after  numeric;
  v_a_after  numeric;
  v_drift    numeric;

  v_pass int;
  v_all  int;
begin
  -- Everything below runs in a subtransaction we abort on purpose.
  begin

    -- ── setup ──────────────────────────────────────────────────────────
    select id into v_admin from profiles where role = 'admin'
     order by created_at limit 1;
    if v_admin is null then
      raise exception 'NO ADMIN: create an admin profile first'
        using errcode = 'SMOKE';
    end if;
    select wallet_unlocked into v_admin_before from profiles where id = v_admin;

    select id into v_app from ott_apps where active order by position limit 1;
    select id into v_tier from ott_plan_tiers
      where ott_app_id = v_app order by position limit 1;
    if v_app is null or v_tier is null then
      raise exception 'NO CATALOGUE: run seed.sql — no OTT platform with a plan tier'
        using errcode = 'SMOKE';
    end if;

    insert into auth.users
      (id, instance_id, aud, role, email, raw_user_meta_data,
       created_at, updated_at)
    values
      (v_seller, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'smoke-seller@test.local',
       jsonb_build_object('name', 'Smoke Seller',
                          'mobile', 'smoke-s-' || left(v_seller::text, 8)),
       now(), now()),
      (v_buyer, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'smoke-buyer@test.local',
       jsonb_build_object('name', 'Smoke Buyer',
                          'mobile', 'smoke-b-' || left(v_buyer::text, 8)),
       now(), now()),
      (v_buyer2, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'smoke-buyer2@test.local',
       jsonb_build_object('name', 'Smoke Buyer Two',
                          'mobile', 'smoke-c-' || left(v_buyer2::text, 8)),
       now(), now());

    update profiles set is_seller = true where id = v_seller;

    insert into groups
      (seller_id, ott_app_id, ott_plan_tier_id, months, date_from, date_to,
       seats_total, price, status)
    values
      (v_seller, v_app, v_tier, 1, current_date, current_date + 30,
       3, v_price, 'approved')
    returning id into v_group;

    -- adjust_balance sets absolute balances, it does not add a delta.
    perform adjust_balance(v_buyer,  0, 1000, 'smoke test');
    perform adjust_balance(v_buyer2, 0, 1000, 'smoke test');

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'setup', 'outcome', 'PASS',
      'detail', 'one seller, two buyers funded 1000 each, one approved group'));

    -- ── 1. purchase ────────────────────────────────────────────────────
    v_fee_pct    := coalesce(setting_num('service_charge_pct'), 0);
    v_expect_fee := round(v_price * v_fee_pct / 100, 2);
    v_expect_debit := case
      when coalesce(setting_text('service_charge_payer'), 'buyer') = 'buyer'
      then v_price + v_expect_fee else v_price end;

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_buyer, 'role', 'authenticated')::text, true);
    v_member := purchase_screen(v_group);
    perform set_config('request.jwt.claims', '', true);

    select wallet_unlocked into v_buyer_unlocked from profiles where id = v_buyer;
    select wallet_locked   into v_seller_locked  from profiles where id = v_seller;
    select wallet_unlocked into v_admin_after    from profiles where id = v_admin;

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'buyer debited',
      'outcome', case when v_buyer_unlocked = 1000 - v_expect_debit
                      then 'PASS' else 'FAIL' end,
      'detail', format('expected %s left, got %s',
                       1000 - v_expect_debit, v_buyer_unlocked)));

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'seller credited, held not spendable',
      'outcome', case when v_seller_locked > 0 then 'PASS' else 'FAIL' end,
      'detail', format('held = %s', v_seller_locked)));

    res := res || jsonb_build_array(jsonb_build_object(
      'step', format('service charge %s%% to admin', v_fee_pct),
      'outcome', case when v_admin_after - v_admin_before = v_expect_fee
                      then 'PASS' else 'FAIL' end,
      'detail', format('expected %s, got %s',
                       v_expect_fee, v_admin_after - v_admin_before)));

    -- The one that matters most: no rupee invented, none lost.
    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'no money created or lost',
      'outcome', case when round(v_expect_debit, 2)
                         = round(v_seller_locked + v_expect_fee, 2)
                      then 'PASS' else 'FAIL' end,
      'detail', format('buyer paid %s, seller+admin received %s',
                       v_expect_debit, v_seller_locked + v_expect_fee)));

    -- ── 2. daily unlock ────────────────────────────────────────────────
    -- Backdate both ends: settle_daily_unlock() works off
    -- (expires_on - joined_on), so moving only joined_on would stretch the
    -- period to 40 days instead of 30.
    update group_members
       set joined_on = current_date - 10, expires_on = current_date + 20
     where id = v_member;

    perform settle_daily_unlock();
    select released into v_released from group_members where id = v_member;

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'daily unlock, 10 of 30 days',
      'outcome', case when v_released > 0 and v_released < v_seller_locked
                      then 'PASS' else 'FAIL' end,
      'detail', format('released %s of %s (a third is about right)',
                       v_released, v_seller_locked)));

    -- ── 3. early exit, personal reason ─────────────────────────────────
    select wallet_unlocked into v_buyer_unlocked from profiles where id = v_buyer;

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_buyer, 'role', 'authenticated')::text, true);
    perform request_exit(v_member, 'personal'::exit_reason, 'smoke test', null);
    perform set_config('request.jwt.claims', '', true);

    select wallet_unlocked - v_buyer_unlocked into v_refund
      from profiles where id = v_buyer;

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'personal exit refunds the buyer',
      'outcome', case when v_refund > 0 then 'PASS' else 'FAIL' end,
      'detail', format('buyer got back %s', v_refund)));

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'membership closed',
      'outcome', case when (select status from group_members where id = v_member)
                           = 'exited' then 'PASS' else 'FAIL' end,
      'detail', (select status::text from group_members where id = v_member)));

    -- ── 3b. faulty-account exit ────────────────────────────────────────
    -- The riskier path: it takes money off the seller and fines them, so it
    -- must not be self-serve. The second buyer takes a seat to exit from.
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_buyer2, 'role', 'authenticated')::text, true);
    v_member2 := purchase_screen(v_group);
    perform set_config('request.jwt.claims', '', true);

    update group_members
       set joined_on = current_date - 10, expires_on = current_date + 20
     where id = v_member2;
    perform settle_daily_unlock();

    -- Buyer raises the claim. Nothing should move yet.
    select wallet_unlocked into v_b_before from profiles where id = v_buyer2;

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_buyer2, 'role', 'authenticated')::text, true);
    perform request_exit(v_member2, 'faulty'::exit_reason,
                         'screen not working', 'https://example.test/proof.jpg');
    perform set_config('request.jwt.claims', '', true);

    select wallet_unlocked into v_b_after from profiles where id = v_buyer2;

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'faulty claim pays nothing until admin approves',
      'outcome', case when v_b_after = v_b_before then 'PASS' else 'FAIL' end,
      'detail', format('buyer balance %s before, %s after raising the claim',
                       v_b_before, v_b_after)));

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'faulty claim is queued, seat still active',
      'outcome', case when (select status from group_members where id = v_member2)
                           = 'active' then 'PASS' else 'FAIL' end,
      'detail', (select status::text from group_members where id = v_member2)));

    -- Admin approves. Snapshot all three parties to prove conservation.
    select wallet_locked + wallet_unlocked into v_s_before
      from profiles where id = v_seller;
    select wallet_locked + wallet_unlocked into v_b_before
      from profiles where id = v_buyer2;
    select wallet_locked + wallet_unlocked into v_a_before
      from profiles where id = v_admin;

    select id into v_req from exit_requests
     where group_member_id = v_member2 and status = 'pending';
    perform approve_exit_request(v_req);

    select wallet_locked + wallet_unlocked into v_s_after
      from profiles where id = v_seller;
    select wallet_locked + wallet_unlocked into v_b_after
      from profiles where id = v_buyer2;
    select wallet_locked + wallet_unlocked into v_a_after
      from profiles where id = v_admin;

    v_drift := (v_s_after - v_s_before)
             + (v_b_after - v_b_before)
             + (v_a_after - v_a_before);

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'faulty exit refunds the buyer',
      'outcome', case when v_b_after > v_b_before then 'PASS' else 'FAIL' end,
      'detail', format('buyer +%s', v_b_after - v_b_before)));

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'faulty exit fines the seller',
      'outcome', case when v_s_after < v_s_before then 'PASS' else 'FAIL' end,
      'detail', format('seller %s (refund plus penalty)',
                       v_s_after - v_s_before)));

    -- Across all three wallets the total must not move by a single paisa.
    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'faulty exit conserves money across all three wallets',
      'outcome', case when round(v_drift, 2) = 0 then 'PASS' else 'FAIL' end,
      'detail', format('seller %s, buyer +%s, admin +%s, drift %s',
                       v_s_after - v_s_before, v_b_after - v_b_before,
                       v_a_after - v_a_before, v_drift)));

    -- ── 3c. rejoining after an exit ────────────────────────────────────
    -- The first buyer left this group earlier. They should be able to come
    -- back. Fails until migration 0016 replaces the blanket unique
    -- constraint on (group_id, buyer_id) with a partial one.
    begin
      perform set_config('request.jwt.claims',
        json_build_object('sub', v_buyer, 'role', 'authenticated')::text, true);
      perform purchase_screen(v_group);
      perform set_config('request.jwt.claims', '', true);
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'buyer can rejoin a group they left',
        'outcome', 'PASS', 'detail', 'rejoined and paid'));
    exception when others then
      perform set_config('request.jwt.claims', '', true);
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'buyer can rejoin a group they left',
        'outcome', 'FAIL', 'detail', left(sqlerrm, 70)));
    end;

    -- ── 4. withdrawal ──────────────────────────────────────────────────
    insert into bank_details (user_id, holder_name, upi_id)
    values (v_seller, 'Smoke Seller', 'smoke@upi');

    perform adjust_balance(v_seller, 0, 500, 'smoke test payout float');

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_seller, 'role', 'authenticated')::text, true);
    v_tx := request_withdraw(200, 'UPI');
    perform set_config('request.jwt.claims', '', true);

    select wallet_unlocked into v_seller_spend from profiles where id = v_seller;

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'withdrawal request holds the money',
      'outcome', case when v_seller_spend = 300 then 'PASS' else 'FAIL' end,
      'detail', format('spendable should be 300, is %s', v_seller_spend)));

    perform approve_withdraw(v_tx);

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'payout clears',
      'outcome', case when (select status from wallet_transactions where id = v_tx)
                           = 'cleared' then 'PASS' else 'FAIL' end,
      'detail', (select status::text from wallet_transactions where id = v_tx)));

    -- ── 5. guards ──────────────────────────────────────────────────────
    -- Asked as the seller, who has bank details on file. As the buyer the
    -- refusal would be "add your bank details" and would prove nothing about
    -- the balance check.
    begin
      perform set_config('request.jwt.claims',
        json_build_object('sub', v_seller, 'role', 'authenticated')::text, true);
      perform request_withdraw(999999, 'UPI');
      perform set_config('request.jwt.claims', '', true);
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'overdraw refused', 'outcome', 'FAIL',
        'detail', 'a 999999 withdrawal was ALLOWED'));
    exception when others then
      perform set_config('request.jwt.claims', '', true);
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'overdraw refused', 'outcome', 'PASS',
        'detail', left(sqlerrm, 70)));
    end;

    begin
      update wallet_ledger set unlocked_delta = 999999 where user_id = v_buyer;
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'ledger is append-only', 'outcome', 'FAIL',
        'detail', 'a ledger row was editable'));
    exception when others then
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'ledger is append-only', 'outcome', 'PASS',
        'detail', left(sqlerrm, 70)));
    end;

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'ledger reconciles with balance',
      'outcome', case when (select coalesce(sum(unlocked_delta), 0)
                              from wallet_ledger where user_id = v_buyer)
                         = (select wallet_unlocked from profiles where id = v_buyer)
                      then 'PASS' else 'FAIL' end,
      'detail', format('ledger says %s, profile says %s',
        (select coalesce(sum(unlocked_delta), 0)
           from wallet_ledger where user_id = v_buyer),
        (select wallet_unlocked from profiles where id = v_buyer))));

    -- Undo everything above. This is the only way out of the block.
    raise exception 'smoke test finished' using errcode = 'SMOKE';

  exception when others then
    -- Database changes are now discarded; `res` survives, because PL/pgSQL
    -- variables are not part of the transaction.
    if sqlstate <> 'SMOKE' then
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'ABORTED — test stopped early', 'outcome', 'FAIL',
        'detail', sqlerrm));
    elsif sqlerrm <> 'smoke test finished' then
      -- A setup precondition failed before any check ran.
      res := jsonb_build_array(jsonb_build_object(
        'step', 'SETUP', 'outcome', 'FAIL', 'detail', sqlerrm));
    end if;
  end;

  select count(*) filter (where e ->> 'outcome' = 'PASS'), count(*)
    into v_pass, v_all
    from jsonb_array_elements(res) e;

  -- Verdict first, then the detail.
  return query
  select 0,
         '═══ VERDICT ═══',
         case when v_pass = v_all and v_all > 0 then 'PASS' else 'FAIL' end,
         format('%s of %s checks passed', v_pass, v_all)
  union all
  select n::int, e ->> 'step', e ->> 'outcome', e ->> 'detail'
    from jsonb_array_elements(res) with ordinality as t(e, n)
  order by 1;
end
$fn$;

-- Only the database owner should be able to mint and destroy test money.
revoke all on function money_smoke_test() from public;

select * from money_smoke_test();
