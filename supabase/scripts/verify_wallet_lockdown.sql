-- Confirms migration 0032 actually closed the wallet-read gap. Run each
-- section separately with:
--   npx supabase db query --linked -f supabase/scripts/verify_wallet_lockdown.sql
-- (the tool only prints the last statement's result, so to see every
-- check, comment out all but one section and re-run.)

-- ── 1. The original hole: a plain authenticated read of the raw wallet
--    columns must now fail with "permission denied for table profiles".
set role authenticated;
select wallet_locked, wallet_unlocked from profiles limit 1;
reset role;

-- ── 2. profiles_public shows the real number for your own row and for
--    admin, and 0 for anyone else's. (Swap in real ids to check by hand;
--    d0d56ddc... is a test user, 9cf3019e... is the seeded admin.)
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0d56ddc-665b-462e-b326-a0bacc1e587f"}', true);
select id, wallet_locked, wallet_unlocked from profiles_public
 where id in ('d0d56ddc-665b-462e-b326-a0bacc1e587f', '9cf3019e-7297-40de-96a0-77c0f5b15c87');
reset role;

-- ── 3. A normal self-edit (name/avatar/etc) still works.
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0d56ddc-665b-462e-b326-a0bacc1e587f"}', true);
update profiles set avatar_url = avatar_url where id = 'd0d56ddc-665b-462e-b326-a0bacc1e587f';
reset role;
select 'self-edit ok' as result;

-- ── 4. The money RPCs still move balances (they run as postgres, which
--    the new trigger explicitly lets through). OPTIONAL — post_ledger()
--    writes a real, permanent row to the append-only wallet_ledger audit
--    table even though the net balance effect below is zero. Already
--    confirmed once (2026-09-22) inside a rolled-back transaction; only
--    run this for real if you want to re-check it against a disposable
--    test account.
-- select post_ledger('<test-user-id>'::uuid, 0, 1, 'verify script — reverted below', null);
-- select post_ledger('<test-user-id>'::uuid, 0, -1, 'verify script — revert', null);
