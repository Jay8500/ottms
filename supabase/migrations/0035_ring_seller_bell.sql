-- ════════════════════════════════════════════════════════════════════════
--  0035 — the chat "ring" bell
--
--  Client: "Put 🔔 Bell icon and Trail count, so that if any user want otp
--  and that seller was offline, user will ring so that customer will come
--  online. (refils 12 hours)." Read as: one ring available per
--  conversation, refilling every 12 hours, so a buyer can nudge an
--  offline seller without being able to spam them.
--
--  last_ring_at lives on chat_threads (not a separate table) because the
--  existing threads_update RLS policy (0002) already lets buyer or seller
--  update their own thread row for any column — no new policy needed for
--  the read/cooldown-check side. The actual send still needs the
--  service-role Firebase call, which only the ring-seller Edge Function
--  can make (see supabase/functions/ring-seller) — this column is just
--  the cooldown clock it reads and writes via the caller's own RLS.
-- ════════════════════════════════════════════════════════════════════════

alter table chat_threads add column last_ring_at timestamptz;

insert into notification_rules (key, title, body_template) values
  ('buyer_ring', '🔔 A buyer needs you',
   '{buyer} is waiting on {ott} — come online when you can.');
