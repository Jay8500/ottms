-- Removes throwaway test accounts created while verifying app behaviour.
-- Safe to run any time — these are never real users.
delete from auth.users where email in (
  '9000000001@moneysaver.app',  -- permission-probe.mjs
  '9000000099@moneysaver.app'   -- duplicate-signup test
);
