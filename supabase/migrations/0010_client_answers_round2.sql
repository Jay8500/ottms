-- ════════════════════════════════════════════════════════════════════════
--  0010 — second round of client answers (Q1–Q7, K4, L2)
--
--  Q4 reverses part of 0009: he originally said bank details could be edited
--  freely, then chose "user can change, but admin approves first".
-- ════════════════════════════════════════════════════════════════════════

-- ── Q1: the 2% on Add Fund is the gateway's, not the platform's ─────────
insert into app_settings (key, value, description) values
  ('addfund_gateway_fee_pct', '2'::jsonb,
   'Payment gateway fee added on top when a user tops up. Collected by Cashfree, not the platform. Q1-A.'),
  ('addfund_platform_fee_pct', '0'::jsonb,
   'Platform earns nothing on Add Fund. Kept as a setting so it can change without a deploy.'),
  ('payment_gateway', '"cashfree"'::jsonb,
   'manual = screenshot + admin approval; cashfree = auto-credit on webhook. Q7.')
on conflict (key) do nothing;

-- ── Q2: the seller keeps one screen for themselves ──────────────────────
-- "he is using 01 screen so out of 04, 03 he can sale". Configurable rather
-- than hardcoded, in case a platform ever allows selling all seats.
insert into app_settings (key, value, description) values
  ('seller_keeps_screens', '1'::jsonb,
   'Screens the seller retains. Sellable seats = plan screens − this. Q2.')
on conflict (key) do nothing;

-- Q2-B: he types the seat price himself, so no automatic price ÷ screens.
update app_settings
   set value = '"admin"'::jsonb
 where key = 'price_setter';

-- ── Q4: bank changes need admin approval ────────────────────────────────
-- Undo the free-edit policy from 0009 and route changes through a queue.
drop policy if exists bank_self_update on bank_details;

alter table bank_details alter column locked set default true;
update bank_details set locked = true;

create table if not exists bank_change_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  holder_name  text not null,
  upi_id       text,
  account_no   text,
  ifsc         text,
  status       tx_status not null default 'pending',
  reject_reason text,
  decided_by   uuid references profiles(id),
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint bank_req_has_destination check (upi_id is not null or account_no is not null)
);

create index if not exists bank_change_pending
  on bank_change_requests (status, created_at desc);

alter table bank_change_requests enable row level security;

create policy bank_req_own on bank_change_requests for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- One open request at a time, and only for yourself.
create policy bank_req_create on bank_change_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and not exists (
      select 1 from bank_change_requests r
       where r.user_id = auth.uid() and r.status = 'pending'
    )
  );

create policy bank_req_admin on bank_change_requests for all to authenticated
  using (is_admin()) with check (is_admin());

/**
 * Applying a bank change is admin-only and writes through the lock, which is
 * the whole point of the queue: a stolen account cannot redirect payouts
 * without a human approving it first.
 */
create or replace function approve_bank_change(p_request uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare r bank_change_requests%rowtype;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  select * into r from bank_change_requests where id = p_request for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'Already %', r.status; end if;

  insert into bank_details (user_id, holder_name, upi_id, account_no, ifsc, locked)
  values (r.user_id, r.holder_name, r.upi_id, r.account_no, r.ifsc, true)
  on conflict (user_id) do update
     set holder_name = excluded.holder_name,
         upi_id      = excluded.upi_id,
         account_no  = excluded.account_no,
         ifsc        = excluded.ifsc;

  update bank_change_requests
     set status = 'cleared', decided_by = auth.uid(), decided_at = now()
   where id = p_request;
end $$;

create or replace function reject_bank_change(p_request uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update bank_change_requests
     set status = 'rejected', reject_reason = p_reason,
         decided_by = auth.uid(), decided_at = now()
   where id = p_request and status = 'pending';
  if not found then raise exception 'Request not found or already decided'; end if;
end $$;

grant execute on function approve_bank_change(uuid) to authenticated;
grant execute on function reject_bank_change(uuid, text) to authenticated;

-- The immutability trigger from 0003 was dropped in 0009; put it back so a
-- direct table write cannot bypass the approval queue.
create trigger bank_details_immutable
  before update on bank_details
  for each row execute function forbid_bank_edit();

-- ── Q5: media lock in chat ──────────────────────────────────────────────
-- Either side may unlock first; photos and voice work only once BOTH have.
-- Re-locks automatically when the conversation is closed.
alter table chat_threads
  add column if not exists buyer_media_unlocked  boolean not null default false,
  add column if not exists seller_media_unlocked boolean not null default false;

create or replace function set_media_unlock(p_thread uuid, p_unlocked boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare t chat_threads%rowtype;
begin
  select * into t from chat_threads where id = p_thread for update;
  if not found then raise exception 'Conversation not found'; end if;

  if t.buyer_id = auth.uid() then
    update chat_threads set buyer_media_unlocked = p_unlocked where id = p_thread;
  elsif t.seller_id = auth.uid() then
    update chat_threads set seller_media_unlocked = p_unlocked where id = p_thread;
  else
    raise exception 'Not your conversation';
  end if;
end $$;

grant execute on function set_media_unlock(uuid, boolean) to authenticated;

-- Enforce the gate server-side. A blocked client could otherwise still POST
-- an image row straight to the table.
create or replace function enforce_media_lock() returns trigger
language plpgsql as $$
declare t chat_threads%rowtype;
begin
  if new.image_url is null then
    return new;   -- plain text is always allowed
  end if;

  select * into t from chat_threads where id = new.thread_id;
  if not (t.buyer_media_unlocked and t.seller_media_unlocked) then
    raise exception 'Both people must unlock media before sharing photos';
  end if;
  return new;
end $$;

drop trigger if exists chat_media_gate on chat_messages;
create trigger chat_media_gate
  before insert on chat_messages
  for each row execute function enforce_media_lock();

-- ── Q3: profile photo compulsory ────────────────────────────────────────
insert into form_fields
  (label, placeholder, icon, icon_bg, field_type, required, enabled,
   require_otp, otp_capable, system, position)
select 'Profile Photo', 'Upload any photo', 'camera-outline', '#E0F2FE',
       'text', true, true, false, false, false, 0
where not exists (select 1 from form_fields where label = 'Profile Photo');

-- ── K4: the "Item" dropdown sorts by OTT app name ───────────────────────
insert into app_settings (key, value, description) values
  ('admin_default_sort', '"ott_name"'::jsonb,
   'What the Item dropdown on admin list screens sorts by. K4.')
on conflict (key) do nothing;
