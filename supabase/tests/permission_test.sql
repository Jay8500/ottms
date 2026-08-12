-- ════════════════════════════════════════════════════════════════════════
--  PERMISSION TEST
--
--  The money smoke test runs as `postgres`, where is_admin() is always true
--  and RLS is bypassed. So it proves the arithmetic and proves nothing at
--  all about permissions.
--
--  This file fixes that. It creates two throwaway users, then actually
--  BECOMES one of them — `set local session authorization authenticated`
--  plus their JWT — so every RLS policy applies exactly as it would to a
--  real phone.
--
--  Each check tries something a user must not be able to do. Failing is
--  passing.
--
--  Check 0 verifies the disguise worked. If it fails, ignore everything
--  else in the run — the attacker was still an admin and the results are
--  meaningless.
--
--  HOW TO RUN
--    Paste the whole file into the SQL Editor, or:
--      select * from permission_test();
--
--  SAFE ON THE LIVE DATABASE
--    Everything happens inside a subtransaction that is aborted before the
--    function returns. No test users or test money survive.
-- ════════════════════════════════════════════════════════════════════════

create or replace function permission_test()
returns table (seq int, step text, outcome text, detail text)
language plpgsql
as $fn$
declare
  res jsonb := '[]'::jsonb;

  v_alice uuid := gen_random_uuid();   -- our attacker
  v_bob   uuid := gen_random_uuid();   -- an innocent bystander
  v_admin uuid;

  v_role_after text;
  v_money_after numeric;
  v_seen int;
  v_pass int;
  v_all  int;

  v_alice_is_admin boolean;

  -- Becomes Alice.
  --
  -- This MUST be SET SESSION AUTHORIZATION, not SET ROLE. is_admin() starts
  -- with `session_user in ('postgres','supabase_admin')` so the SQL Editor
  -- can run admin RPCs. SET ROLE changes current_user but leaves
  -- session_user as postgres — so Alice would still pass is_admin(), every
  -- `using (is_admin())` policy would let her through, and the test would
  -- report holes that do not exist. SET SESSION AUTHORIZATION changes both.
  --
  -- In production PostgREST connects as `authenticator` and switches role,
  -- so session_user is never postgres. This makes the test match that.
  c_become_alice text;
begin
  c_become_alice := format(
    'set local session authorization authenticated; '
    'select set_config(''request.jwt.claims'', %L, true)',
    json_build_object('sub', v_alice, 'role', 'authenticated')::text);

  begin
    select id into v_admin from profiles where role = 'admin'
     order by created_at limit 1;

    -- ── setup, as postgres ───────────────────────────────────────────
    insert into auth.users
      (id, instance_id, aud, role, email, raw_user_meta_data,
       created_at, updated_at)
    values
      (v_alice, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'perm-alice@test.local',
       jsonb_build_object('name', 'Alice',
                          'mobile', 'perm-a-' || left(v_alice::text, 8)),
       now(), now()),
      (v_bob, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'perm-bob@test.local',
       jsonb_build_object('name', 'Bob',
                          'mobile', 'perm-b-' || left(v_bob::text, 8)),
       now(), now());

    -- Bob has money and bank details worth stealing.
    perform adjust_balance(v_bob, 0, 5000, 'permission test');
    insert into bank_details (user_id, holder_name, upi_id, account_no, ifsc)
    values (v_bob, 'Bob', 'bob@upi', '1234567890', 'HDFC0000215');

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'setup', 'outcome', 'PASS',
      'detail', 'Alice (attacker) and Bob (victim, 5000 + bank details)'));

    -- ══ 0. Is the test itself set up correctly? ═════════════════════
    -- If is_admin() is true while we are pretending to be Alice, then every
    -- `using (is_admin())` policy lets her through and all nine results
    -- below are worthless. This check must come first and must pass.
    begin
      execute c_become_alice;
      select is_admin() into v_alice_is_admin;
      reset session authorization;
    exception when others then
      reset session authorization;
      v_alice_is_admin := null;
    end;

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'the test is really running as a normal user',
      'outcome', case when v_alice_is_admin is false then 'PASS' else 'FAIL' end,
      'detail', case
        when v_alice_is_admin is false then 'is_admin() says no — results below are meaningful'
        when v_alice_is_admin is true  then
          'is_admin() says YES — session_user is still postgres, ignore every result below'
        else 'could not switch user — ignore every result below' end));

    -- ══ 1. Can Alice make herself admin? ════════════════════════════
    begin
      execute c_become_alice;
      update profiles set role = 'admin' where id = v_alice;
      reset session authorization;
    exception when others then
      reset session authorization;
    end;

    select role into v_role_after from profiles where id = v_alice;
    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'Alice cannot make herself admin',
      'outcome', case when v_role_after = 'user' then 'PASS' else 'FAIL' end,
      'detail', case when v_role_after = 'user'
                     then 'still a normal user'
                     else 'SHE IS NOW ADMIN — whole admin panel exposed' end));

    -- ══ 2. Can Alice pay herself? ═══════════════════════════════════
    begin
      execute c_become_alice;
      update profiles set wallet_unlocked = 999999 where id = v_alice;
      reset session authorization;
    exception when others then
      reset session authorization;
    end;

    select wallet_unlocked into v_money_after from profiles where id = v_alice;
    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'Alice cannot top up her own wallet',
      'outcome', case when v_money_after = 0 then 'PASS' else 'FAIL' end,
      'detail', format('her balance is %s', v_money_after)));

    -- ══ 3. Can Alice take Bob's money? ══════════════════════════════
    begin
      execute c_become_alice;
      update profiles set wallet_unlocked = 0 where id = v_bob;
      reset session authorization;
    exception when others then
      reset session authorization;
    end;

    select wallet_unlocked into v_money_after from profiles where id = v_bob;
    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'Alice cannot touch Bob''s balance',
      'outcome', case when v_money_after = 5000 then 'PASS' else 'FAIL' end,
      'detail', format('Bob still has %s', v_money_after)));

    -- ══ 4. Can Alice read Bob's bank details? ═══════════════════════
    begin
      execute c_become_alice;
      select count(*) into v_seen from bank_details where user_id = v_bob;
      reset session authorization;
    exception when others then
      reset session authorization;
      v_seen := -1;
    end;

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'Alice cannot read Bob''s bank details',
      'outcome', case when v_seen = 0 then 'PASS' else 'FAIL' end,
      'detail', case when v_seen = 0 then 'invisible to her'
                     when v_seen = -1 then 'blocked with an error'
                     else 'SHE CAN SEE HIS ACCOUNT NUMBER' end));

    -- ══ 5. Can Alice write the ledger directly? ═════════════════════
    begin
      execute c_become_alice;
      perform post_ledger(v_alice, 0, 999999, 'free money');
      reset session authorization;
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'Alice cannot call post_ledger', 'outcome', 'FAIL',
        'detail', 'SHE WROTE THE LEDGER DIRECTLY'));
    exception when others then
      reset session authorization;
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'Alice cannot call post_ledger', 'outcome', 'PASS',
        'detail', left(sqlerrm, 60)));
    end;

    -- ══ 6. Can Alice refund herself without admin review? ═══════════
    begin
      execute c_become_alice;
      perform exit_membership(gen_random_uuid(), 'faulty'::exit_reason, 'x');
      reset session authorization;
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'Alice cannot call exit_membership', 'outcome', 'FAIL',
        'detail', 'SHE REACHED THE NO-REVIEW REFUND PATH'));
    exception when others then
      reset session authorization;
      -- "Membership not found" would mean she got past the permission gate.
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'Alice cannot call exit_membership',
        'outcome', case when sqlerrm ilike '%permission denied%'
                        then 'PASS' else 'FAIL' end,
        'detail', left(sqlerrm, 60)));
    end;

    -- ══ 7. Can Alice credit a Cashfree order herself? ═══════════════
    begin
      execute c_become_alice;
      perform credit_paid_order('anything', 'anything');
      reset session authorization;
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'Alice cannot call credit_paid_order', 'outcome', 'FAIL',
        'detail', 'SHE CAN CREDIT WALLETS'));
    exception when others then
      reset session authorization;
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'Alice cannot call credit_paid_order',
        'outcome', case when sqlerrm ilike '%permission denied%'
                        then 'PASS' else 'FAIL' end,
        'detail', left(sqlerrm, 60)));
    end;

    -- ══ 8. Can Alice edit an app setting? ═══════════════════════════
    begin
      execute c_become_alice;
      update app_settings set value = '0'::jsonb
       where key = 'service_charge_pct';
      reset session authorization;
    exception when others then
      reset session authorization;
    end;

    res := res || jsonb_build_array(jsonb_build_object(
      'step', 'Alice cannot change the service charge',
      'outcome', case when coalesce(setting_num('service_charge_pct'), -1) <> 0
                      then 'PASS' else 'FAIL' end,
      'detail', format('service charge is still %s%%',
                       setting_num('service_charge_pct'))));

    -- ══ 9. Can Alice give herself a seat without paying? ════════════
    begin
      execute c_become_alice;
      insert into group_members
        (group_id, buyer_id, expires_on, amount_paid)
      select id, v_alice, current_date + 30, 0 from groups limit 1;
      reset session authorization;
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'Alice cannot insert a free membership', 'outcome', 'FAIL',
        'detail', 'SHE GAVE HERSELF A SEAT FOR ZERO'));
    exception when others then
      reset session authorization;
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'Alice cannot insert a free membership', 'outcome', 'PASS',
        'detail', left(sqlerrm, 60)));
    end;

    raise exception 'permission test finished' using errcode = 'PERMT';

  exception when others then
    begin reset session authorization; exception when others then null; end;
    if sqlstate <> 'PERMT' then
      res := res || jsonb_build_array(jsonb_build_object(
        'step', 'ABORTED — test stopped early', 'outcome', 'FAIL',
        'detail', sqlerrm));
    end if;
  end;

  select count(*) filter (where e ->> 'outcome' = 'PASS'), count(*)
    into v_pass, v_all
    from jsonb_array_elements(res) e;

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

revoke all on function permission_test() from public;

select * from permission_test();
