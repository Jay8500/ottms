-- ════════════════════════════════════════════════════════════════════════
--  Seed data — the catalog currently hardcoded in DataService.
--  Safe to re-run: everything is keyed on a natural unique column.
--
--  PRICES ARE PLACEHOLDERS. Questionnaire D1 is unanswered; these use the
--  mockup figures (₹50 / 99 / 170 / 250). Change them in the admin panel or
--  re-run this file once the client confirms.
-- ════════════════════════════════════════════════════════════════════════

-- ── Categories ──────────────────────────────────────────────────────────
insert into categories (title, sub_name, color, icon, position, active) values
  ('Entertainment', 'Movies & Shows',   '#F9D54B', 'film-outline',            1, true),
  ('Music''s',      'Songs & Podcasts', '#EF4444', 'musical-notes-outline',   2, false),
  ('Gaming',        'Consoles & PC',    '#8B5CF6', 'game-controller-outline', 3, false),
  ('Education',     'Courses',          '#3B82F6', 'book-outline',            4, false),
  ('Fitness',       'Health & Gym',     '#10B981', 'barbell-outline',         5, false)
on conflict do nothing;

-- ── OTT platforms ───────────────────────────────────────────────────────
with cat as (select id from categories where title = 'Entertainment' limit 1)
insert into ott_apps (category_id, title, brand, color, starting_price, position)
select cat.id, v.title, v.brand, v.color, v.price, v.pos
from cat, (values
  ('Netflix',         'netflix',   '#E50914', 149, 1),
  ('Prime Video',     'prime',     '#00A8E0',  99, 2),
  ('Disney+ Hotstar', 'hotstar',   '#1565C0', 109, 3),
  ('ZEE5',            'zee5',      '#8E24AA',  79, 4),
  ('Sony LIV',        'sonyliv',   '#E91E63',  89, 5),
  ('Voot',            'voot',      '#4C1D95',  69, 6),
  ('Aha',             'aha',       '#F97316',  59, 7),
  ('Discovery+',      'discovery', '#2563EB',  49, 8),
  ('Apple TV+',       'appletv',   '#111827',  99, 9),
  ('Sun NXT',         'sunnxt',    '#BE123C',  45, 10),
  ('Hoichoi',         'hoichoi',   '#DC2626',  39, 11),
  ('Lionsgate Play',  'lionsgate', '#EAB308',  55, 12)
) as v(title, brand, color, price, pos)
on conflict do nothing;

-- ── Plan tiers & seat limits ────────────────────────────────────────────
insert into ott_plan_tiers (ott_app_id, label, max_screens, position)
select a.id, v.label, v.screens, v.pos
from ott_apps a
join (values
  ('netflix',   'Mobile',   1, 1), ('netflix',   'Basic',    2, 2),
  ('netflix',   'Standard', 3, 3), ('netflix',   'Premium',  4, 4),
  ('prime',     'HD',       3, 1), ('prime',     '4K Ultra', 4, 2),
  ('hotstar',   'Super',    2, 1), ('hotstar',   'Premium',  4, 2),
  ('zee5',      'Premium',  5, 1),
  ('sonyliv',   'Mobile',   1, 1), ('sonyliv',   'Premium',  5, 2),
  ('voot',      'Premium',  4, 1),
  ('aha',       'Premium',  2, 1),
  ('discovery', 'Premium',  3, 1),
  ('appletv',   'Premium',  6, 1),
  ('sunnxt',    'Premium',  4, 1),
  ('hoichoi',   'Premium',  3, 1),
  ('lionsgate', 'Premium',  3, 1)
) as v(brand, label, screens, pos) on v.brand = a.brand
on conflict do nothing;

-- ── Validity plans ──────────────────────────────────────────────────────
insert into validity_plans (title, months, color, icon, position) values
  ('01-Month',   1,  '#F9D54B', 'calendar-outline', 1),
  ('3-Months',   3,  '#10B981', 'calendar-outline', 2),
  ('6-Months',   6,  '#3B82F6', 'calendar-outline', 3),
  ('12-Months',  12, '#8B5CF6', 'calendar-outline', 4)
on conflict do nothing;

-- Placeholder global prices (no ott_app_id) — replace once D1 is answered.
insert into plan_prices (validity_plan_id, amount, save_upto)
select id,
       case months when 1 then 50 when 3 then 99 when 6 then 170 else 250 end,
       case months when 1 then 0  when 3 then 51 when 6 then 130 else 350 end
from validity_plans
on conflict do nothing;

-- ── Home buttons ────────────────────────────────────────────────────────
insert into home_buttons (title, color, icon, icon_position, route, position) values
  ('Support',   '#F9D54B', 'headset-outline',  'left', '/user/support',  1),
  ('New Offer', '#F9D54B', 'pricetag-outline', 'left', '/user/category', 2)
on conflict do nothing;

-- ── Commerce options ────────────────────────────────────────────────────
insert into commerce_options (title, sub_name, action, color, icon, position) values
  ('Purchase', 'Private Screen',  'purchase', '#F9D54B', 'cart-outline',   1),
  ('Share',    'Personal Screen', 'share',    '#3B82F6', 'people-outline', 2)
on conflict do nothing;

-- ── Sign-up form fields ─────────────────────────────────────────────────
-- `system` marks the two nobody can delete: without them there is no account.
insert into form_fields
  (label, placeholder, icon, icon_bg, field_type, required, enabled, require_otp, otp_capable, system, position)
values
  ('Full Name',     'Full Name',     'person-outline',      '#E3F2FD', 'text',     true,  true, false, false, false, 1),
  ('Nick Name',     'Nick Name',     'happy-outline',       '#FFF9E0', 'text',     false, true, false, false, false, 2),
  ('Mobile Number', 'Mobile Number', 'call-outline',        '#E8F5E9', 'tel',      true,  true, true,  true,  true,  3),
  ('Mail ID',       'Mail ID',       'mail-outline',        '#F3E5F5', 'email',    false, true, true,  true,  false, 4),
  ('Password',      'Password',      'lock-closed-outline', '#FFEBEE', 'password', true,  true, false, false, true,  5)
on conflict do nothing;

-- ── Badges ──────────────────────────────────────────────────────────────
insert into badges (label, emoji, color, positive, position) values
  ('Trusted Seller',  '⭐', '#16A34A', true,  1),
  ('Faster Service',  '⚡', '#F9D54B', true,  2),
  ('Premium Support', '👑', '#8B5CF6', true,  3),
  ('Quick Responder', '💬', '#2563EB', true,  4),
  ('Top Performer',   '🏆', '#E65100', true,  5),
  ('Reliable Service','🛡️', '#0891B2', true,  6),
  ('Slow Response',   '🐢', '#DC2626', false, 7)
on conflict (label) do nothing;

-- ── FAQs ────────────────────────────────────────────────────────────────
with new_faq as (
  insert into faqs (position) values (1) returning id
)
insert into faq_translations (faq_id, lang, question, answer)
select id, v.lang::lang_code, v.q, v.a from new_faq, (values
  ('en', 'What is Money Saver?',
         'Money Saver is an app where all OTT Platform subscriptions can be sold and purchased in the form of sharing.'),
  ('hi', 'मनी सेवर क्या है?',
         'मनी सेवर एक ऐप है जहाँ सभी OTT सब्सक्रिप्शन शेयरिंग के रूप में बेचे और खरीदे जा सकते हैं।'),
  ('te', 'మనీ సేవర్ అంటే ఏమిటి?',
         'మనీ సేవర్ అనేది OTT సబ్‌స్క్రిప్షన్‌లను షేరింగ్ రూపంలో అమ్మి కొనగలిగే యాప్.')
) as v(lang, q, a);

with new_faq as (
  insert into faqs (position) values (2) returning id
)
insert into faq_translations (faq_id, lang, question, answer)
select id, v.lang::lang_code, v.q, v.a from new_faq, (values
  ('en', 'How can I earn money?',
         'Customers can share their membership with other users and earn money for un-used screens and accounts.'),
  ('hi', 'मैं पैसे कैसे कमा सकता हूँ?',
         'ग्राहक अपनी सदस्यता अन्य उपयोगकर्ताओं के साथ साझा कर सकते हैं और अप्रयुक्त स्क्रीन के लिए पैसे कमा सकते हैं।'),
  ('te', 'నేను డబ్బు ఎలా సంపాదించగలను?',
         'వినియోగదారులు తమ మెంబర్‌షిప్‌ను ఇతరులతో పంచుకొని ఉపయోగించని స్క్రీన్‌లకు డబ్బు సంపాదించవచ్చు.')
) as v(lang, q, a);

-- ── Social links ────────────────────────────────────────────────────────
insert into social_links (title, url, color, icon, position) values
  ('WhatsApp',  'https://wa.me/919876500000', '#25D366', 'logo-whatsapp',       1),
  ('Instagram', 'https://instagram.com/',     '#E1306C', 'logo-instagram',      2),
  ('YouTube',   'https://youtube.com/',       '#FF0000', 'logo-youtube',        3),
  ('Telegram',  'https://t.me/',              '#229ED9', 'paper-plane-outline', 4)
on conflict do nothing;

-- ── Payment details ─────────────────────────────────────────────────────
update payment_config set
  name        = 'John Doe',
  upi_id      = 'moneysaver@upi',
  upi_mobile  = '+91 98765 43210',
  bank_name   = 'XYZ Bank',
  bank_masked = '**** 1234'
where id = true;

-- ── Terms ───────────────────────────────────────────────────────────────
update legal_documents set body =
  '1. Money Saver is a peer-to-peer marketplace for sharing OTT subscriptions.' || E'\n' ||
  '2. Bank and UPI details are captured once at signup and cannot be changed.' || E'\n' ||
  '3. All Add Fund and Withdraw requests are manually verified by admin.'      || E'\n' ||
  '4. Sharing personal contact details in chat is prohibited.'                 || E'\n' ||
  '5. Selling a faulty account attracts a penalty.'
where slug = 'terms';