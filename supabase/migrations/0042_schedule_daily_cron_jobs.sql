-- ════════════════════════════════════════════════════════════════════════
--  0042 — actually schedule daily-unlock and expire-members
--
--  supabase/README.md documented these as a manual one-time SQL Editor step
--  ("Database → Extensions → enable pg_cron, then run these two schedules"),
--  but pg_cron itself was never enabled on this project — confirmed live:
--  `select extname from pg_extension where extname='pg_cron'` returned zero
--  rows before today. So neither job has ever actually run.
--
--  Confirmed safe to turn on now: zero rows exist in group_members on the
--  live database (no real purchase has completed yet — still pre-launch),
--  so there is nothing to "catch up" and no risk of a surprise bulk unlock
--  or mass-expiry. Both functions are idempotent regardless (see 0003).
-- ════════════════════════════════════════════════════════════════════════

select cron.schedule('daily-unlock', '0 1 * * *', $$ select settle_daily_unlock() $$);
select cron.schedule('expire-members', '30 1 * * *', $$ select expire_memberships() $$);
