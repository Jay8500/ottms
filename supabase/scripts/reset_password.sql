-- ════════════════════════════════════════════════════════════════════════
--  RESET A USER'S PASSWORD
--
--  The app has no working "Forgot Password" — it needs an SMS provider that
--  is not connected. Until that exists, this is the only way to reset a
--  password, and support has to do it by hand.
--
--  The app turns a mobile into a fake email:  9059542610@moneysaver.app
--  So to reset someone, replace the mobile number in all three statements.
--
--  Run the sections in order.
-- ════════════════════════════════════════════════════════════════════════


-- ── 1. WHAT IS WRONG? ───────────────────────────────────────────────────
-- Run this on its own first and read the result.
--
--   email_confirmed_at is NULL
--     "Confirm email" is switched on in Supabase. Our emails are fake, so a
--     confirmation mail goes nowhere and NOBODY can ever sign in. Turn it
--     off: Authentication → Sign In / Providers → Email → Confirm email.
--
--   email_confirmed_at has a date
--     The account is fine; the stored password is simply not what you think.
--
--   no rows at all
--     The sign-up never completed. Register again in the app.

select
  u.email,
  u.email_confirmed_at,
  u.last_sign_in_at,
  u.encrypted_password is not null as has_password,
  p.name,
  p.role
from auth.users u
left join profiles p on p.id = u.id
where u.email = '9059542610@moneysaver.app';


-- ── 2. FIX IT ───────────────────────────────────────────────────────────
-- Sets the password AND confirms the email together, so it works whichever
-- of the two was the problem.
--
-- crypt() and gen_salt() come from pgcrypto, which Supabase already has.
-- 'bf' is bcrypt — the same hashing the normal sign-up uses, so the account
-- ends up identical to one created through the app.

update auth.users
   set encrypted_password = crypt('shareotts', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at         = now()
 where email = '9059542610@moneysaver.app';


-- ── 3. CONFIRM ──────────────────────────────────────────────────────────

select email,
       email_confirmed_at is not null as confirmed,
       updated_at
  from auth.users
 where email = '9059542610@moneysaver.app';


-- Now sign in with the mobile number and the new password.
