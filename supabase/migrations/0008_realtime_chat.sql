-- ════════════════════════════════════════════════════════════════════════
--  0008 — live chat
--
--  Realtime only broadcasts tables that are members of the
--  supabase_realtime publication. Row Level Security still applies to the
--  stream, so a subscriber is only sent rows they could have SELECTed —
--  the messages_read policy from 0002 keeps other people's conversations
--  private on the socket as well as over REST.
--
--  Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'chat_threads'
  ) then
    alter publication supabase_realtime add table chat_threads;
  end if;
end $$;

-- REPLICA IDENTITY FULL puts the old row in the payload on UPDATE/DELETE.
-- Without it those events carry only the primary key, so a client cannot
-- tell which thread the changed row belonged to.
alter table chat_messages replica identity full;
alter table chat_threads  replica identity full;

-- ── Presence ────────────────────────────────────────────────────────────
-- Sellers show as Online in the sellers list and chat header. Server-side,
-- so nobody can claim someone else's status.
create or replace function set_presence(p_online boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update profiles
     set is_online = p_online,
         last_seen_at = now()
   where id = auth.uid();
end $$;

grant execute on function set_presence(boolean) to authenticated;

-- Anyone idle for more than 5 minutes is stale. A force-quit never sends a
-- goodbye, so without this sweep sellers would show Online forever.
--   select cron.schedule('presence-sweep', '*/5 * * * *',
--                        $$ select sweep_presence() $$);
create or replace function sweep_presence()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with stale as (
    update profiles set is_online = false
     where is_online
       and (last_seen_at is null or last_seen_at < now() - interval '5 minutes')
     returning id
  )
  select count(*) into v_count from stale;
  return v_count;
end $$;