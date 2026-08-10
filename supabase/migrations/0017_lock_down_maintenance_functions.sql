-- ════════════════════════════════════════════════════════════════════════
--  0017 — take the maintenance functions away from ordinary users
--
--  Postgres grants EXECUTE on a new function to PUBLIC by default. Anything
--  never explicitly revoked is therefore callable by any signed-in user.
--  The money RPCs were revoked; the scheduled housekeeping ones were not.
--
--  None of them is exploitable today — every figure they write is derived
--  from dates, so calling one early changes nothing and calling it twice
--  changes nothing. This is hygiene, not an incident: it means a future edit
--  to the release maths cannot quietly become a way to pull money forward.
--
--  pg_cron runs as postgres, so the schedules are unaffected.
-- ════════════════════════════════════════════════════════════════════════

revoke execute on function settle_daily_unlock()  from public, authenticated;
revoke execute on function expire_memberships()   from public, authenticated;
revoke execute on function sweep_presence()       from public, authenticated;

-- Returns the admin's user id. Harmless on its own, but there is no reason
-- for a buyer's session to be able to ask for it.
revoke execute on function admin_user_id()        from public, authenticated;
