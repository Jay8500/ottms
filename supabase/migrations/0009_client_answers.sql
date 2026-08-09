-- ════════════════════════════════════════════════════════════════════════
--  0009 — apply the client's questionnaire answers
--
--  Only the settled ones. Q1 (fee on Add Fund) and Q2 (price ÷ screens) are
--  still open, so nothing here touches how a purchase price is calculated.
-- ════════════════════════════════════════════════════════════════════════

-- ── Money rules (E1, F2, F3, F4, I1, I2, D2, D3) ────────────────────────
begin;

update app_settings set value = '2'::jsonb        where key = 'service_charge_pct';       -- E1: start at 2%
update app_settings set value = '"buyer"'::jsonb  where key = 'service_charge_payer';      -- E1: buyer pays on top
update app_settings set value = '5'::jsonb        where key = 'withdraw_fee_pct';          -- F3: 5% on withdrawal
update app_settings set value = '100'::jsonb      where key = 'withdraw_min';              -- F4: "more than 100"
update app_settings set value = '48'::jsonb       where key = 'withdraw_sla_hours';        -- F2: 24–48 hours
update app_settings set value = '"global"'::jsonb where key = 'price_mode';                -- D2: one price list for now
update app_settings set value = '"admin"'::jsonb  where key = 'price_setter';              -- D3: admin sets it

-- I1: his worked example — ₹20 unused, buyer ₹10, seller ₹5, admin ₹5.
-- The trigger requires these to total 100, so they move together.
update app_settings set value = '50'::jsonb where key = 'exit_personal_refund_pct';
update app_settings set value = '25'::jsonb where key = 'exit_personal_seller_pct';
update app_settings set value = '25'::jsonb where key = 'exit_personal_admin_pct';

-- I2: penalty applies to the unused refunded portion only
update app_settings set value = '"unused_portion"'::jsonb where key = 'faulty_penalty_base';

commit;

-- ── A3: bank details freely editable ────────────────────────────────────
-- The client chose option 3 over the spec's "set once". Removing the guard.
-- Worth remembering this is the control that stopped a stolen account from
-- redirecting withdrawals to a new bank number.
drop trigger if exists bank_details_immutable on bank_details;
alter table bank_details alter column locked set default false;
update bank_details set locked = false;

create policy bank_self_update on bank_details for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── K3: admin reads every conversation ──────────────────────────────────
-- The client was explicit: "We don't promise chat is private". Admin also
-- needs full-text search across all messages.
drop policy if exists messages_read on chat_messages;

create policy messages_read on chat_messages for select to authenticated
  using (is_thread_participant(thread_id) or is_admin());

-- Supports the admin search box without a sequential scan per keystroke.
create index if not exists chat_messages_body_search
  on chat_messages using gin (to_tsvector('simple', coalesce(body, '')));

-- ── H2: group limit per platform, set by admin ──────────────────────────
-- Default 1, but the client wants Netflix 1 and another platform 3.
alter table ott_apps
  add column if not exists max_active_groups integer not null default 1
  check (max_active_groups between 1 and 20);

-- The old hard constraint allowed exactly one; replace it with the
-- configurable check below.
drop index if exists one_active_group_per_seller_per_app;

create or replace function enforce_group_limit() returns trigger
language plpgsql as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.status not in ('pending', 'approved', 'full') then
    return new;
  end if;

  select max_active_groups into v_limit from ott_apps where id = new.ott_app_id;
  v_limit := coalesce(v_limit, 1);

  select count(*) into v_count
    from groups
   where seller_id = new.seller_id
     and ott_app_id = new.ott_app_id
     and status in ('pending', 'approved', 'full')
     and id <> new.id;

  if v_count >= v_limit then
    raise exception
      'You already have % active group(s) on this platform. The limit is %.',
      v_count, v_limit;
  end if;

  return new;
end $$;

drop trigger if exists groups_limit on groups;
create trigger groups_limit
  before insert or update on groups
  for each row execute function enforce_group_limit();

-- ── A2: every sign-up field compulsory ──────────────────────────────────
-- "All, and give option to add new if any" — the Form Builder already
-- supports adding fields; this makes the existing ones required.
update form_fields set required = true, enabled = true;

-- ── K1: Refer a Friend is in this release after all ─────────────────────
create table if not exists referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references profiles(id) on delete cascade,
  referred_id   uuid references profiles(id) on delete set null,
  code          text not null unique,
  reward_amount numeric(12,2) not null default 0,
  rewarded      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists referrals_referrer on referrals (referrer_id);

alter table referrals enable row level security;

create policy referrals_own on referrals for select to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid() or is_admin());
create policy referrals_admin on referrals for all to authenticated
  using (is_admin()) with check (is_admin());

insert into app_settings (key, value, description) values
  ('referral_reward', '0'::jsonb, 'Rupees credited to the referrer once their invitee completes a purchase. K1.'),
  ('referral_enabled', 'true'::jsonb, 'Master switch for the referral programme.')
on conflict (key) do nothing;