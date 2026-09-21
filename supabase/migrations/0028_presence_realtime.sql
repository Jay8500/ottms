-- ════════════════════════════════════════════════════════════════════════
--  0028 — live online/offline status in chat
--
--  Client (round 5): "Online/Offline - Not updating Immediately - Need to
--  go back and reopen then its updating in other person phone."
--
--  set_presence() (0008) has always updated profiles.is_online correctly.
--  The gap was that profiles was never added to the supabase_realtime
--  publication — only chat_messages and chat_threads were — so no client
--  subscription could ever receive a change to it, no matter how the
--  subscription was written.
--
--  Same pattern and same safety note as 0008: RLS still applies to the
--  realtime stream, so a subscriber only receives rows they could already
--  SELECT over REST. profiles_read is already `using (true)`.
--
--  Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table profiles;
  end if;
end $$;

alter table profiles replica identity full;
