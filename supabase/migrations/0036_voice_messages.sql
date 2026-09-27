-- ════════════════════════════════════════════════════════════════════════
--  0036 — voice messages in chat
--
--  Client: "Need voice record option (if any Uneducated person has issue,
--  he can use that)." A voice note, same shape as a photo message —
--  chat-audio mirrors chat-images exactly: bucket created here rather than
--  by hand in the dashboard (0022's five buckets predate this and were
--  made manually; nothing stops making a new one from a migration).
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public) values ('chat-audio', 'chat-audio', false);

create policy "chat-audio: a participant can post in their thread"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-audio'
    and exists (
      select 1 from chat_threads t
       where t.id::text = (storage.foldername(name))[1]
         and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

create policy "chat-audio: a participant or admin can view"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-audio'
    and (
      is_admin()
      or exists (
        select 1 from chat_threads t
         where t.id::text = (storage.foldername(name))[1]
           and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
      )
    )
  );

alter table chat_messages add column audio_url text;

alter table chat_messages drop constraint message_has_content;
alter table chat_messages add constraint message_has_content
  check (body is not null or image_url is not null or audio_url is not null);
