-- ════════════════════════════════════════════════════════════════════════
--  0006 — let trusted server-side contexts pass is_admin()
--
--  The SQL Editor, the service_role key and pg_cron all run without a user
--  JWT, so auth.uid() is null and is_admin() rejected them. That made every
--  admin RPC unusable from the dashboard.
--
--  IMPORTANT: this uses session_user, NOT current_user. is_admin() is
--  SECURITY DEFINER, so current_user is always the function owner (postgres)
--  regardless of caller — testing it would make *everyone* an admin. Under
--  SECURITY DEFINER session_user still reports who actually connected, and
--  every PostgREST request connects as `authenticator`, never as postgres.
-- ════════════════════════════════════════════════════════════════════════

create or replace function is_admin() returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_role text;
begin
  -- Direct database connection: SQL Editor, psql, pg_cron.
  if session_user in ('postgres', 'supabase_admin') then
    return true;
  end if;

  -- Server-to-server call holding the service_role key.
  begin
    v_role := auth.role();
  exception when others then
    v_role := null;
  end;
  if v_role = 'service_role' then
    return true;
  end if;

  -- Normal case: a signed-in user whose profile says admin.
  return exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
end $$;

comment on function is_admin() is
  'True for admin users, and for trusted server-side contexts (SQL Editor, service_role, cron). Uses session_user because current_user is masked by SECURITY DEFINER.';