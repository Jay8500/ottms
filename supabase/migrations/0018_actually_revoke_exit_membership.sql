-- ════════════════════════════════════════════════════════════════════════
--  0018 — close the exit_membership back door (SECURITY)
--
--  0011 moved faulty-account exits behind admin review and ended with:
--
--      revoke execute on function exit_membership(...) from authenticated;
--
--  That did nothing. Postgres grants EXECUTE on a new function to PUBLIC,
--  and revoking from a role does not remove a PUBLIC grant — `authenticated`
--  kept inheriting it. The neighbouring revokes said `from public,
--  authenticated` and worked; this one did not, and nothing surfaced the
--  difference until the preflight check asked the database directly.
--
--  Impact while it was open: exit_membership pays a refund with no admin
--  review. It checks the caller owns the seat, and requires p_proof_url to
--  be non-null for a faulty claim — but any string passes. So a buyer could
--  purchase a seat, call exit_membership(seat, 'faulty', 'x') straight away,
--  reclaim nearly the whole amount and have the seller fined 10% on top.
--  Repeatable against any seller. Exactly the attack 0011 was written to
--  prevent.
--
--  request_exit() and approve_exit_request() are SECURITY DEFINER and call
--  this function internally as the owner, so they are unaffected. The buyer
--  route stays: request_exit → admin approves → exit_membership.
--
--  Found by supabase/tests/preflight_check.sql.
-- ════════════════════════════════════════════════════════════════════════

revoke execute on function exit_membership(uuid, exit_reason, text)
  from public, authenticated;

-- Belt and braces: if any future migration re-creates this function, the
-- default PUBLIC grant comes back with it. Nothing here prevents that, so
-- the preflight check is the standing guard — run it after every migration.
