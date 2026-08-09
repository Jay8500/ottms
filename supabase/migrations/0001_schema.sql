-- ════════════════════════════════════════════════════════════════════════
--  OTT Money Saver — core schema
--  Run in Supabase SQL Editor, or `supabase db push` if you adopt the CLI.
--
--  Money is numeric(12,2), never float. Every split is rounded explicitly
--  in the RPCs (0003) so rupees can never be created or lost by rounding.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────
create type user_role      as enum ('user', 'admin');
create type tx_type        as enum ('funded', 'expense');
create type tx_kind        as enum ('addfund', 'withdraw', 'purchase', 'sale', 'refund', 'penalty', 'service_fee');
create type tx_status      as enum ('pending', 'cleared', 'rejected');
create type group_status   as enum ('pending', 'approved', 'rejected', 'full', 'expired');
create type member_status  as enum ('active', 'expiring', 'expired', 'exited');
create type exit_reason    as enum ('personal', 'faulty');
create type penalty_base   as enum ('sale_price', 'unused_portion', 'wallet_balance');
create type lang_code      as enum ('en', 'hi', 'te');

-- ════════════════════════════════════════════════════════════════════════
--  SETTINGS — every money rule lives here, not in code.
--  The client's questionnaire answers become UPDATEs to this table.
-- ════════════════════════════════════════════════════════════════════════
create table app_settings (
  key         text primary key,
  value       jsonb       not null,
  description text        not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

comment on table app_settings is
  'Money rules and app-wide config. Changing a value here changes behaviour with no deploy.';

insert into app_settings (key, value, description) values
  ('service_charge_pct',      '0'::jsonb,              'Percent taken by admin on each purchase. Questionnaire E1.'),
  ('service_charge_payer',    '"buyer"'::jsonb,        'buyer = added on top; seller = deducted from payout. E1.'),
  ('withdraw_fee_pct',        '0'::jsonb,              'Percent deducted from a withdrawal. Questionnaire F3.'),
  ('withdraw_min',            '0'::jsonb,              'Smallest withdrawal allowed, in rupees. F4.'),
  ('withdraw_sla_hours',      '24'::jsonb,             'Payout promise shown to users. F2.'),
  ('exit_personal_refund_pct','50'::jsonb,             'Share of the unused amount returned on a personal-reason exit.'),
  ('exit_personal_seller_pct','25'::jsonb,             'Share of the unused amount kept by the seller. I1.'),
  ('exit_personal_admin_pct', '25'::jsonb,             'Share of the unused amount kept by admin. I1.'),
  ('exit_faulty_refund_pct',  '100'::jsonb,            'Share returned when the account was faulty.'),
  ('faulty_penalty_pct',      '10'::jsonb,             'Seller penalty for a faulty account. I2.'),
  ('faulty_penalty_base',     '"sale_price"'::jsonb,   'What the penalty percentage applies to. I2.'),
  ('price_mode',              '"per_platform"'::jsonb, 'per_platform = price set per platform+plan; global = one price list. D2.'),
  ('price_setter',            '"admin"'::jsonb,        'admin | seller | seller_within_range. D3.');

-- The three personal-exit shares must account for the whole unused amount,
-- otherwise money silently vanishes on every early exit.
create or replace function assert_exit_split_balances() returns trigger
language plpgsql as $$
declare refund_pct numeric; seller_pct numeric; admin_pct numeric;
begin
  select (value #>> '{}')::numeric into refund_pct from app_settings where key = 'exit_personal_refund_pct';
  select (value #>> '{}')::numeric into seller_pct from app_settings where key = 'exit_personal_seller_pct';
  select (value #>> '{}')::numeric into admin_pct  from app_settings where key = 'exit_personal_admin_pct';

  if refund_pct + seller_pct + admin_pct <> 100 then
    raise exception
      'Exit split must total 100%% (refund % + seller % + admin % = %)',
      refund_pct, seller_pct, admin_pct, refund_pct + seller_pct + admin_pct;
  end if;
  return null;
end $$;

create constraint trigger app_settings_exit_split
  after insert or update on app_settings
  deferrable initially deferred
  for each row execute function assert_exit_split_balances();

-- ════════════════════════════════════════════════════════════════════════
--  PEOPLE
-- ════════════════════════════════════════════════════════════════════════
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  unique_number   integer     not null unique,
  name            text        not null,
  nick_name       text,
  mobile          text        not null unique,
  email           text,
  role            user_role   not null default 'user',
  is_seller       boolean     not null default false,
  avatar_url      text,
  mobile_verified boolean     not null default false,
  email_verified  boolean     not null default false,
  is_online       boolean     not null default false,
  last_seen_at    timestamptz,
  -- balances are maintained by the RPCs alongside wallet_ledger rows
  wallet_locked   numeric(12,2) not null default 0 check (wallet_locked   >= 0),
  wallet_unlocked numeric(12,2) not null default 0 check (wallet_unlocked >= 0),
  created_at      timestamptz not null default now()
);

comment on column profiles.wallet_locked is
  'Held funds. Released daily across the buyer''s validity period by settle_daily_unlock().';

-- Bank details: captured once, then immutable (freeze doc / questionnaire A3).
create table bank_details (
  user_id     uuid primary key references profiles(id) on delete cascade,
  holder_name text not null,
  upi_id      text,
  account_no  text,
  ifsc        text,
  locked      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint bank_has_a_destination check (upi_id is not null or account_no is not null)
);

-- Sequence for the human-facing "unique number" shown as (587) beside a name.
create sequence profile_unique_number_seq start 100;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, unique_number, name, mobile, email)
  values (
    new.id,
    nextval('profile_unique_number_seq'),
    coalesce(new.raw_user_meta_data ->> 'name', 'User'),
    coalesce(new.raw_user_meta_data ->> 'mobile', new.phone, ''),
    new.email
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ════════════════════════════════════════════════════════════════════════
--  CATALOG (admin-editable CMS)
-- ════════════════════════════════════════════════════════════════════════
create table categories (
  id         uuid primary key default gen_random_uuid(),
  title      text    not null,
  sub_name   text,
  color      text    not null default '#F9D54B',
  icon       text    not null default 'film-outline',
  image_url  text,
  position   integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table ott_apps (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid references categories(id) on delete set null,
  title          text    not null,
  sub_name       text,
  brand          text    not null,   -- logo lookup key
  color          text    not null default '#1565C0',
  icon           text    not null default 'tv-outline',
  image_url      text,
  starting_price numeric(12,2) not null default 0,
  position       integer not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table ott_plan_tiers (
  id          uuid primary key default gen_random_uuid(),
  ott_app_id  uuid not null references ott_apps(id) on delete cascade,
  label       text not null,
  max_screens integer not null check (max_screens between 1 and 20),
  position    integer not null default 0,
  unique (ott_app_id, label)
);

create table validity_plans (
  id         uuid primary key default gen_random_uuid(),
  title      text    not null,
  sub_name   text,
  months     integer not null check (months > 0),
  color      text    not null default '#F9D54B',
  icon       text    not null default 'calendar-outline',
  image_url  text,
  position   integer not null default 0,
  active     boolean not null default true
);

-- Price per platform + plan tier + duration. Collapses to a global list by
-- leaving ott_app_id and tier null, if the client chooses that (D2).
create table plan_prices (
  id               uuid primary key default gen_random_uuid(),
  ott_app_id       uuid references ott_apps(id) on delete cascade,
  ott_plan_tier_id uuid references ott_plan_tiers(id) on delete cascade,
  validity_plan_id uuid not null references validity_plans(id) on delete cascade,
  amount           numeric(12,2) not null check (amount >= 0),
  save_upto        numeric(12,2) not null default 0 check (save_upto >= 0),
  active           boolean not null default true,
  unique (ott_app_id, ott_plan_tier_id, validity_plan_id)
);

-- ════════════════════════════════════════════════════════════════════════
--  GROUPS & MEMBERSHIPS
-- ════════════════════════════════════════════════════════════════════════
create table groups (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid not null references profiles(id) on delete cascade,
  ott_app_id       uuid not null references ott_apps(id),
  ott_plan_tier_id uuid references ott_plan_tiers(id),
  validity_plan_id uuid references validity_plans(id),
  months           integer not null check (months > 0),
  date_from        date not null,
  date_to          date not null,
  seats_total      integer not null check (seats_total between 1 and 20),
  price            numeric(12,2) not null check (price >= 0),
  status           group_status not null default 'pending',
  proof_url        text,
  comment          text,
  reject_reason    text,
  created_at       timestamptz not null default now(),
  constraint group_dates_ordered check (date_to > date_from)
);

-- Freeze doc: one active group per seller per platform.
create unique index one_active_group_per_seller_per_app
  on groups (seller_id, ott_app_id)
  where status in ('pending', 'approved', 'full');

create table group_members (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups(id) on delete cascade,
  buyer_id      uuid not null references profiles(id) on delete cascade,
  joined_on     date not null default current_date,
  expires_on    date not null,
  amount_paid   numeric(12,2) not null check (amount_paid >= 0),
  -- what the seller earns from this seat, after any service charge they bear
  seller_credit numeric(12,2) not null default 0 check (seller_credit >= 0),
  -- how much of seller_credit has already moved from locked to unlocked
  released      numeric(12,2) not null default 0 check (released >= 0),
  status        member_status not null default 'active',
  exited_at     timestamptz,
  exit_reason   exit_reason,
  exit_proof_url text,
  constraint member_dates_ordered check (expires_on > joined_on),
  unique (group_id, buyer_id)
);

comment on table group_members is
  'One seat. Each buyer has their own join and expiry date — groups do not share one expiry.';

-- ════════════════════════════════════════════════════════════════════════
--  MONEY
-- ════════════════════════════════════════════════════════════════════════
create table wallet_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  tx_type         tx_type   not null,
  tx_kind         tx_kind   not null,
  status          tx_status not null default 'pending',
  amount          numeric(12,2) not null check (amount > 0),
  -- context
  group_id        uuid references groups(id) on delete set null,
  group_member_id uuid references group_members(id) on delete set null,
  counterparty_id uuid references profiles(id) on delete set null,
  payment_app     text,
  txn_ref         text,
  screenshot_url  text,
  reject_reason   text,
  decided_by      uuid references profiles(id),
  decided_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- Append-only audit trail. Balances on `profiles` are derived from this;
-- if the two ever disagree, this table is the truth.
create table wallet_ledger (
  id             bigserial primary key,
  user_id        uuid not null references profiles(id) on delete cascade,
  transaction_id uuid references wallet_transactions(id) on delete set null,
  locked_delta   numeric(12,2) not null default 0,
  unlocked_delta numeric(12,2) not null default 0,
  reason         text not null,
  created_at     timestamptz not null default now()
);

create or replace function forbid_ledger_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'wallet_ledger is append-only — correct with a compensating entry instead';
end $$;

create trigger wallet_ledger_immutable
  before update or delete on wallet_ledger
  for each row execute function forbid_ledger_mutation();

-- ════════════════════════════════════════════════════════════════════════
--  CHAT
-- ════════════════════════════════════════════════════════════════════════
create table chat_threads (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references groups(id) on delete cascade,
  buyer_id     uuid not null references profiles(id) on delete cascade,
  seller_id    uuid not null references profiles(id) on delete cascade,
  locked       boolean not null default false,
  reported     boolean not null default false,
  report_note  text,
  last_message text,
  last_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (group_id, buyer_id)
);

comment on column chat_threads.reported is
  'Admin may read messages only on reported threads — questionnaire K3.';

create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references chat_threads(id) on delete cascade,
  sender_id  uuid not null references profiles(id) on delete cascade,
  body       text,
  image_url  text,
  created_at timestamptz not null default now(),
  constraint message_has_content check (body is not null or image_url is not null)
);

-- ════════════════════════════════════════════════════════════════════════
--  REPUTATION
-- ════════════════════════════════════════════════════════════════════════
create table ratings (
  id              uuid primary key default gen_random_uuid(),
  rated_user_id   uuid not null references profiles(id) on delete cascade,
  rater_user_id   uuid not null references profiles(id) on delete cascade,
  group_member_id uuid references group_members(id) on delete set null,
  stars           integer not null check (stars between 1 and 5),
  body            text,
  created_at      timestamptz not null default now(),
  -- freeze doc: only after a completed deal, and once per deal
  unique (rater_user_id, group_member_id)
);

create table badges (
  id       uuid primary key default gen_random_uuid(),
  label    text not null unique,
  emoji    text not null default '⭐',
  color    text not null default '#F9D54B',
  positive boolean not null default true,
  position integer not null default 0
);

create table badge_awards (
  id              uuid primary key default gen_random_uuid(),
  badge_id        uuid not null references badges(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  awarded_by      uuid references profiles(id) on delete set null,
  group_member_id uuid references group_members(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
--  CONTENT (admin-editable)
-- ════════════════════════════════════════════════════════════════════════
create table home_buttons (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  color         text not null default '#F9D54B',
  icon          text not null default 'headset-outline',
  icon_position text not null default 'left' check (icon_position in ('left','top','right')),
  route         text not null,
  image_url     text,
  position      integer not null default 0,
  active        boolean not null default true
);

create table commerce_options (
  id        uuid primary key default gen_random_uuid(),
  title     text not null,
  sub_name  text,
  action    text not null check (action in ('purchase','share')),
  color     text not null default '#F9D54B',
  icon      text not null default 'cart-outline',
  image_url text,
  position  integer not null default 0,
  active    boolean not null default true
);

create table form_fields (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  placeholder text not null default '',
  icon        text not null default 'create-outline',
  icon_bg     text not null default '#EEEEEE',
  field_type  text not null default 'text' check (field_type in ('text','tel','email','password')),
  required    boolean not null default false,
  enabled     boolean not null default true,
  require_otp boolean not null default false,
  otp_capable boolean not null default false,
  system      boolean not null default false,   -- cannot be deleted or disabled
  position    integer not null default 0
);

create table faqs (
  id       uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  active   boolean not null default true
);

create table faq_translations (
  faq_id    uuid not null references faqs(id) on delete cascade,
  lang      lang_code not null,
  question  text not null,
  answer    text not null default '',
  video_url text,
  primary key (faq_id, lang)
);

create table social_links (
  id       uuid primary key default gen_random_uuid(),
  title    text not null,
  url      text not null,
  color    text not null default '#1565C0',
  icon     text not null default 'link-outline',
  position integer not null default 0,
  active   boolean not null default true
);

create table payment_config (
  id           boolean primary key default true check (id),  -- single row
  qr_image_url text,
  name         text not null default '',
  upi_id       text not null default '',
  upi_mobile   text not null default '',
  bank_name    text not null default '',
  bank_masked  text not null default '',
  updated_at   timestamptz not null default now()
);

insert into payment_config (id) values (true);

create table legal_documents (
  slug       text primary key,          -- 'terms', 'privacy'
  body       text not null default '',
  updated_at timestamptz not null default now()
);

insert into legal_documents (slug, body) values ('terms', ''), ('privacy', '');

-- ════════════════════════════════════════════════════════════════════════
--  NOTIFICATIONS (admin-configurable — questionnaire L1 / L2)
-- ════════════════════════════════════════════════════════════════════════
create table notification_rules (
  key           text primary key,
  title         text not null,
  body_template text not null,
  enabled       boolean not null default true,
  -- for expiry reminders: fire this many days before expiry
  offset_days   integer,
  updated_at    timestamptz not null default now()
);

insert into notification_rules (key, title, body_template, offset_days) values
  ('payment_received',  'Payment received',  'We received your payment of ₹{amount}.',            null),
  ('payment_approved',  'Payment approved',  'Your wallet has been credited with ₹{amount}.',     null),
  ('payment_rejected',  'Payment rejected',  'Your payment was rejected: {reason}',               null),
  ('group_approved',    'Group approved',    'Your {ott} group is now live.',                     null),
  ('group_rejected',    'Group rejected',    'Your {ott} group was rejected: {reason}',           null),
  ('chat_message',      'New message',       '{sender}: {preview}',                               null),
  ('member_added',      'Added to a group',  'You have joined {ott} {plan}.',                     null),
  ('expiry_reminder_5', 'Expiring soon',     'Your {ott} access ends in 5 days.',                 5),
  ('expiry_reminder_2', 'Expiring soon',     'Your {ott} access ends in 2 days.',                 2),
  ('expiry_today',      'Expires today',     'Your {ott} access ends today.',                     0);

create table device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text not null unique,
  platform   text not null default 'android',
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
--  INDEXES — every foreign key, plus the columns the admin screens sort by
-- ════════════════════════════════════════════════════════════════════════
create index on profiles (role);
create index on profiles (unique_number);
create index on ott_apps (category_id, position);
create index on ott_plan_tiers (ott_app_id);
create index on plan_prices (ott_app_id, validity_plan_id);
create index on groups (seller_id);
create index on groups (ott_app_id);
create index on groups (status, created_at desc);
create index on group_members (group_id);
create index on group_members (buyer_id);
create index on group_members (status, expires_on);
create index on wallet_transactions (user_id, created_at desc);
create index on wallet_transactions (status, tx_kind, created_at desc);
create index on wallet_transactions (group_id);
create index on wallet_ledger (user_id, created_at desc);
create index on chat_threads (buyer_id);
create index on chat_threads (seller_id);
create index on chat_threads (last_at desc);
create index on chat_messages (thread_id, created_at desc);
create index on ratings (rated_user_id);
create index on badge_awards (user_id);
create index on device_tokens (user_id);