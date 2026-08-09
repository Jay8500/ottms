-- ════════════════════════════════════════════════════════════════════════
--  Row Level Security
--
--  The app ships with the publishable key, so these policies ARE the
--  security model. Nothing is protected by the client.
--
--  Rule of thumb: users touch only their own rows; catalog and content are
--  world-readable but admin-writable; the wallet ledger is untouchable from
--  the client and is only written by the SECURITY DEFINER functions in 0003.
-- ════════════════════════════════════════════════════════════════════════

-- SECURITY DEFINER so checking "am I admin?" does not re-enter profiles RLS.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_thread_participant(t_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_threads
    where id = t_id and (buyer_id = auth.uid() or seller_id = auth.uid())
  );
$$;

alter table app_settings        enable row level security;
alter table profiles            enable row level security;
alter table bank_details        enable row level security;
alter table categories          enable row level security;
alter table ott_apps            enable row level security;
alter table ott_plan_tiers      enable row level security;
alter table validity_plans      enable row level security;
alter table plan_prices         enable row level security;
alter table groups              enable row level security;
alter table group_members       enable row level security;
alter table wallet_transactions enable row level security;
alter table wallet_ledger       enable row level security;
alter table chat_threads        enable row level security;
alter table chat_messages       enable row level security;
alter table ratings             enable row level security;
alter table badges              enable row level security;
alter table badge_awards        enable row level security;
alter table home_buttons        enable row level security;
alter table commerce_options    enable row level security;
alter table form_fields         enable row level security;
alter table faqs                enable row level security;
alter table faq_translations    enable row level security;
alter table social_links        enable row level security;
alter table payment_config      enable row level security;
alter table legal_documents     enable row level security;
alter table notification_rules  enable row level security;
alter table device_tokens       enable row level security;

-- ── Settings ────────────────────────────────────────────────────────────
-- Readable by all: the app must show the withdrawal fee and minimum.
create policy settings_read  on app_settings for select to authenticated using (true);
create policy settings_write on app_settings for all    to authenticated
  using (is_admin()) with check (is_admin());

-- ── Profiles ────────────────────────────────────────────────────────────
-- Buyers need to see a seller's name, rating and online state, so the row is
-- readable. Nothing sensitive lives here — bank details are a separate table.
create policy profiles_read      on profiles for select to authenticated using (true);
create policy profiles_self_edit on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin     on profiles for all    to authenticated
  using (is_admin()) with check (is_admin());

-- ── Bank details ────────────────────────────────────────────────────────
-- Only the owner and admin. Insert once; the immutability trigger in 0003
-- stops later edits while `locked` is true.
create policy bank_own    on bank_details for select to authenticated
  using (user_id = auth.uid() or is_admin());
create policy bank_insert on bank_details for insert to authenticated
  with check (user_id = auth.uid());
create policy bank_admin  on bank_details for all    to authenticated
  using (is_admin()) with check (is_admin());

-- ── Catalog & content: world-readable, admin-writable ───────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'categories','ott_apps','ott_plan_tiers','validity_plans','plan_prices',
    'home_buttons','commerce_options','form_fields','faqs','faq_translations',
    'social_links','payment_config','legal_documents','badges','notification_rules'
  ] loop
    execute format(
      'create policy %1$s_read on %1$s for select to authenticated using (true)', t);
    execute format(
      'create policy %1$s_admin on %1$s for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- ── Groups ──────────────────────────────────────────────────────────────
-- Buyers browse approved groups; sellers always see their own.
create policy groups_read on groups for select to authenticated
  using (status in ('approved','full') or seller_id = auth.uid() or is_admin());

create policy groups_seller_insert on groups for insert to authenticated
  with check (seller_id = auth.uid() and status = 'pending');

-- A seller may edit only while the listing is still pending review.
create policy groups_seller_update on groups for update to authenticated
  using (seller_id = auth.uid() and status = 'pending')
  with check (seller_id = auth.uid() and status = 'pending');

create policy groups_admin on groups for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── Memberships ─────────────────────────────────────────────────────────
-- Created only by purchase_screen(); no direct client insert.
create policy members_read on group_members for select to authenticated
  using (
    buyer_id = auth.uid()
    or exists (select 1 from groups g where g.id = group_id and g.seller_id = auth.uid())
    or is_admin()
  );
create policy members_admin on group_members for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── Money ───────────────────────────────────────────────────────────────
create policy tx_read on wallet_transactions for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- Users may raise an add-fund or withdraw request, always as pending and
-- always for themselves. Everything else is created by the RPCs.
create policy tx_request on wallet_transactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and tx_kind in ('addfund','withdraw')
  );

create policy tx_admin on wallet_transactions for all to authenticated
  using (is_admin()) with check (is_admin());

-- Read-only even for admin. Writes happen inside SECURITY DEFINER functions.
create policy ledger_read on wallet_ledger for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- ── Chat ────────────────────────────────────────────────────────────────
-- Admin sees that a thread exists, but not its messages unless reported.
create policy threads_read on chat_threads for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());
create policy threads_update on chat_threads for update to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin())
  with check (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());

create policy messages_read on chat_messages for select to authenticated
  using (
    is_thread_participant(thread_id)
    or (is_admin() and exists (
          select 1 from chat_threads t where t.id = thread_id and t.reported
       ))
  );

create policy messages_send on chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and is_thread_participant(thread_id)
    and not exists (select 1 from chat_threads t where t.id = thread_id and t.locked)
  );

-- ── Reputation ──────────────────────────────────────────────────────────
create policy ratings_read on ratings for select to authenticated using (true);

-- Only after a completed deal the rater was actually part of.
create policy ratings_write on ratings for insert to authenticated
  with check (
    rater_user_id = auth.uid()
    and exists (
      select 1 from group_members m
      join groups g on g.id = m.group_id
      where m.id = group_member_id
        and (m.buyer_id = auth.uid() or g.seller_id = auth.uid())
    )
  );
create policy ratings_admin on ratings for all to authenticated
  using (is_admin()) with check (is_admin());

create policy awards_read  on badge_awards for select to authenticated using (true);
create policy awards_admin on badge_awards for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── Push tokens ─────────────────────────────────────────────────────────
create policy tokens_own on device_tokens for all to authenticated
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid());