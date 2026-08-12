-- ════════════════════════════════════════════════════════════════════════
--  RESET A USER'S PASSWORD
--
--  The app has no working "Forgot Password" — it needs an SMS provider that
--  is not connected. Until that exists, this file is the only way to reset
--  someone's password, and support has to do it by hand.
--
--  Edit the two values at the top, then run the whole file.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. WHO AND WHAT ─────────────────────────────────────────────────────
-- The app turns a mobile into a fake email: 9059542610@moneysaver.app
-- Put the mobile number and the new password here.

\set target_mobile   '9059542610'
\set new_password    'shareotts'

-- The SQL Editor does not support \set, so the values are repeated inline
-- below. Change them in BOTH statements.

-- ── 2. WHAT IS WRONG? ───────────────────────────────────────────────────
-- Run this first. It tells you whether the account exists, whether it has a
-- password, and whether the email was ever confirmed.
--
--   email_confirmed_at NULL  ->  "Confirm email" is switched on in Supabase.
--                                Our emails are fake and can never be
--                                confirmed, so nobody can ever sign in.
--                                Turn it OFF: Authentication → Sign In /
--                                Providers → Email → Confirm email.

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

-- ── 3. FIX IT ───────────────────────────────────────────────────────────
-- Sets the password and confirms the email in one go, so it works whichever
-- of the two was the problem.
--
-- crypt/gen_salt come from pgcrypto, which Supabase already has. 'bf' is
-- bcrypt, the same hashing the sign-up path uses, so the account is
-- indistinguishable from a normally created one.

update auth.users
   set encrypted_password = crypt('shareotts', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at         = now()
 where email = '9059542610@moneysaver.app';

-- ── 4. CONFIRM ──────────────────────────────────────────────────────────
select email, email_confirmed_at is not null as confirmed, updated_at
  from auth.users
 where email = '9059542610@moneysaver.app';

-- Then sign in with the mobile number and the new password.
