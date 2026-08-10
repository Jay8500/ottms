-- ════════════════════════════════════════════════════════════════════════
--  0012 — the client's real details
--
--  Values supplied by the client. The QR image is uploaded separately
--  through Admin → Payment Form, since it is a file rather than a setting.
-- ════════════════════════════════════════════════════════════════════════

-- ── Where users send money ──────────────────────────────────────────────
update payment_config set
  name        = 'Maakam Bharath Kumar',
  upi_id      = 'mbk231998-2@oksbi',
  upi_mobile  = '+91 90595 42610',
  bank_name   = 'HDFC',
  bank_masked = '',
  updated_at  = now()
where id = true;

-- ── Support contacts ────────────────────────────────────────────────────
insert into social_links (title, url, color, icon, position, active) values
  ('WhatsApp', 'https://wa.me/917013931261', '#25D366', 'logo-whatsapp', 1, true),
  ('Call Us',  'tel:+917013931261',          '#2563EB', 'call-outline',  2, true)
on conflict do nothing;

-- Instagram / YouTube / Telegram are coming later — hide the seeded
-- placeholders so the Support screen does not show dead links.
update social_links set active = false
 where title in ('Instagram', 'YouTube', 'Telegram');

-- ── Settings the client confirmed ───────────────────────────────────────
insert into app_settings (key, value, description) values
  ('support_whatsapp', '"917013931261"'::jsonb, 'WhatsApp number shown on the Support screen.'),
  ('support_phone',    '"917013931261"'::jsonb, 'Phone number shown on the Support screen.'),
  ('support_email',    '"shareottssupport@gmail.com"'::jsonb, 'Play Store contact address.'),
  ('brand_name',       '"ShareOTTs"'::jsonb, 'Display name. Client renamed from Money Saver.')
on conflict (key) do update set value = excluded.value;

-- Referral stays off until he sets an amount.
update app_settings set value = '0'::jsonb    where key = 'referral_reward';
update app_settings set value = 'false'::jsonb where key = 'referral_enabled';

-- OTP login is deferred (he chose password only), so make sure no field is
-- demanding a code nobody can send.
update form_fields set require_otp = false;

-- ── Cashfree ────────────────────────────────────────────────────────────
-- Only the public App ID lives here. The Secret Key is an Edge Function
-- secret and must never reach the client bundle.
insert into app_settings (key, value, description) values
  ('cashfree_app_id', '"TEST11163048c7a7888feaa244f743ed84036111"'::jsonb,
   'Cashfree App ID. Public — safe in the app. TEST credentials.'),
  ('cashfree_mode', '"sandbox"'::jsonb,
   'sandbox or production. Switch only after KYC is approved and live keys are set.')
on conflict (key) do update set value = excluded.value;
