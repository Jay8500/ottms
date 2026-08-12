-- ════════════════════════════════════════════════════════════════════════
--  0019 — make sure the Cashfree webhook can still credit wallets
--
--  0013 ended with:
--
--      revoke execute on function credit_paid_order(text,text)
--        from public, authenticated;
--
--  That is right for users — nobody should be able to credit their own
--  wallet. But the webhook calls the same function using the service role
--  key. If that revoke also removed service_role's grant, then:
--
--      user pays ₹500 → Cashfree takes it → wallet stays ₹0 → no error
--
--  Nothing in the app would show a problem. We would only find out when a
--  real customer complained about missing money.
--
--  Supabase normally gives service_role its own grant through default
--  privileges, so this is probably already fine. Granting explicitly costs
--  nothing and removes the doubt. service_role is the server-side key and
--  already bypasses RLS, so this gives it no power it did not have.
--
--  Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════

grant execute on function credit_paid_order(text, text) to service_role;
grant execute on function fail_order(text, text)        to service_role;
