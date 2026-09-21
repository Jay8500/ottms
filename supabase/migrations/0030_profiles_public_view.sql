-- ════════════════════════════════════════════════════════════════════════
--  0030 — a safe way to look up someone else's profile
--
--  Found while working on chat presence, not something the client asked
--  for: profiles_read (0002) grants SELECT on the WHOLE row to any
--  signed-in user —
--
--    create policy profiles_read on profiles for select to authenticated
--      using (true);
--
--  RLS is row-level, not column-level. The stated intent was to let a
--  buyer see a seller's name, rating and online state, but "using (true)"
--  makes every column readable on every row, including wallet_locked and
--  wallet_unlocked — anyone holding the app's publishable key (it ships
--  inside the APK) can already ask for any other user's exact wallet
--  balance over a plain REST call today. This is not new; it has been
--  true since 0002.
--
--  This migration is DELIBERATELY additive and changes nothing about what
--  already works. It adds profiles_public, a view with the wallet columns
--  masked to 0 for anyone but the row's owner or an admin — everything
--  else (name, rating inputs, avatar, online state, seller flag) passes
--  through unchanged. auth.uid() inside a view resolves per caller, so
--  this is safe to query broadly.
--
--  NOT done here, on purpose: profiles_read itself is not narrowed, and
--  no application code has been pointed at this view yet. The app has
--  many call sites that read another person's profile — sellers list,
--  chat peer info, ratings, the admin user list — and switching every one
--  of them over needs to be checked against a real device, screen by
--  screen, not guessed at from here. Doing that blind risks quietly
--  breaking something as basic as a seller's name failing to show on a
--  purchase card, which is a worse outcome than the current gap: the
--  current issue is read-only visibility of a number, not something that
--  can be exploited to move money. Treat this as the foundation for a
--  dedicated follow-up pass, not the fix itself.
-- ════════════════════════════════════════════════════════════════════════

create or replace view profiles_public
  with (security_invoker = true)
as
select
  id, name, nick_name, unique_number, avatar_url, role, is_seller,
  is_online, last_seen_at, created_at,
  case when id = auth.uid() or is_admin() then wallet_locked   else 0 end as wallet_locked,
  case when id = auth.uid() or is_admin() then wallet_unlocked else 0 end as wallet_unlocked
from profiles;

comment on view profiles_public is
  'Safe to query for "someone else''s profile" — wallet balance is masked
   unless you are looking at your own row or you are admin. Not yet used
   by any application code; see the migration comment for why.';
