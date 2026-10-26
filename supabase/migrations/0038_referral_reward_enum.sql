-- ════════════════════════════════════════════════════════════════════════
--  0038 — groundwork for actually crediting referral rewards
--
--  Found by QA trace: "Refer a Friend" shows an "earned" number that can
--  never move, and the promised "₹X on their first purchase" never
--  happens. redeem_referral() (0011) records referred_id + reward_amount
--  but nothing anywhere ever sets `rewarded = true` or credits a wallet —
--  myReferralStats() literally filters on `rewarded`, which starts false
--  and stays false forever.
--
--  0039 does the actual crediting, hooked into purchase_screen() on the
--  referred buyer's first purchase (matching the screen's own copy). A new
--  enum value can't be used in the same transaction it's added in, so that
--  goes in its own migration, after this one.
-- ════════════════════════════════════════════════════════════════════════

alter type tx_kind add value if not exists 'referral';

-- SEL-10 found sellers have no way to withdraw their own listing before
-- anyone approves/joins it — no UI action and no RPC. 0040 adds one; it
-- needs a status distinct from 'rejected' (that means admin said no, not
-- the seller changing their mind) and distinct from 'expired' (ran its
-- course) — a new enum value, so it goes here for the same reason as
-- 'referral' above.
alter type group_status add value if not exists 'cancelled';

-- Separately: USR-20 found the same "nothing ever runs this" shape in
-- sweep_presence() (0008) — its cron line was written but left commented
-- out, so a force-killed (not cleanly backgrounded) app shows Online
-- forever with nothing to correct it. daily-unlock and expire-members
-- already run as real cron jobs in this project, so pg_cron is already
-- enabled — safe to schedule this one the same way.
select cron.schedule('presence-sweep', '*/5 * * * *', $$ select sweep_presence() $$);
