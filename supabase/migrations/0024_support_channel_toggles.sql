-- ════════════════════════════════════════════════════════════════════════
--  0024 — enable/disable switches for support channels and languages
--
--  Client (round 4): "Give option to Enable / Disable & Edit (InApp Chats,
--  WhatsApp, CallUs & Languages)."
--
--  WhatsApp and CallUs already have this — they are ordinary social_links
--  rows with an `active` flag, editable in Admin -> Follow Us. Nothing new
--  needed there.
--
--  In-App Chat and the 3 language buttons had no admin control at all: both
--  were unconditionally rendered in support.page.html. Adding them as
--  app_settings, same convention as every other on/off rule in this app.
--
--  saveSettings() only UPDATEs existing rows — it has no insert path — so
--  these must be seeded here before admin can ever toggle them.
-- ════════════════════════════════════════════════════════════════════════

insert into app_settings (key, value, description) values
  ('support_inapp_chat_enabled', 'true'::jsonb, 'Show the In-App Chat button on the Support screen.'),
  ('support_lang_hi_enabled',    'true'::jsonb, 'Show Hindi as a language choice on the Support screen.'),
  ('support_lang_te_enabled',    'true'::jsonb, 'Show Telugu as a language choice on the Support screen.')
on conflict (key) do nothing;
