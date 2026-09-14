-- ════════════════════════════════════════════════════════════════════════
--  0027 — In-App Chat talks to the App Team
--
--  Client (round 4): "In App Chats - Not working, it should open chat with
--  App Team, we will chat from Admin App."
--
--  "In-App Chat" on the Support screen opened the user's existing trade
--  chats — makes sense next to WhatsApp and Call Us as a support channel,
--  wrong as what it actually did.
--
--  No schema change needed. chat_threads already allows group_id to be
--  null; every existing thread just happens to always have one, because
--  purchase_screen() is the only place that has ever created one. A support
--  thread reuses the same table with group_id null and the admin standing
--  in as seller_id — is_thread_participant() already checks
--  "buyer_id or seller_id = auth.uid()", so admin gets real read/send access
--  to it via the ordinary chat_messages policies, no special-casing needed.
--
--  KNOWN LIMIT: admin_user_id() picks one admin (the oldest account). If a
--  second admin account is ever added, only the original one is a
--  participant in existing support threads — a second admin could not read
--  them unless the thread is separately marked `reported`. Fine while there
--  is one admin; worth a proper multi-admin inbox design before there are two.
-- ════════════════════════════════════════════════════════════════════════

-- A user only ever gets one support thread. group_id is null for all of
-- them, and Postgres treats every NULL as distinct — the table's existing
-- unique(group_id, buyer_id) would not stop two support threads for the
-- same person, so a dedicated partial index covers that case specifically.
create unique index chat_threads_one_support_thread
  on chat_threads (buyer_id, seller_id)
  where group_id is null;

create or replace function get_or_create_support_thread()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_admin uuid;
  v_id    uuid;
begin
  if v_user is null then raise exception 'Not signed in'; end if;

  v_admin := admin_user_id();
  if v_admin is null then raise exception 'Support is not available right now'; end if;

  -- A user talking to admin is always the buyer side of this thread, even
  -- for a seller account — "buyer" here just means "the one who is not
  -- staff", matching the buyer/seller shape the rest of chat already uses.
  if v_user = v_admin then raise exception 'Admin does not chat with themselves'; end if;

  -- Insert first and let the unique index settle a double-tap race, rather
  -- than check-then-insert with a gap in between the two statements.
  insert into chat_threads (buyer_id, seller_id, group_id, last_message, last_at)
  values (v_user, v_admin, null, 'Conversation started', now())
  on conflict (buyer_id, seller_id) where group_id is null do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from chat_threads
     where buyer_id = v_user and seller_id = v_admin and group_id is null;
  end if;

  return v_id;
end $$;

grant execute on function get_or_create_support_thread() to authenticated;
