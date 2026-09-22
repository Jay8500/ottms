-- ════════════════════════════════════════════════════════════════════════
--  0033 — admin-manageable quick replies
--
--  Client sign-off, chat unlock question: "put Quick reply customly i
--  admin can create what User, seller or admin can use and put no of
--  times usage count." The five quick-reply buttons in chat were
--  hardcoded in chat.page.ts with no way for admin to add, remove, or
--  restrict who sees one.
--
--  "No of times usage count" is read as per-conversation, not a global or
--  per-user lifetime cap — the app already has every message for the
--  current thread loaded when the chat screen renders, so counting how
--  many times a given quick reply was already sent in THIS conversation
--  needs no new tracking table or RPC; a global or lifetime counter would.
-- ════════════════════════════════════════════════════════════════════════

create table quick_replies (
  id         uuid primary key default gen_random_uuid(),
  text       text not null,
  for_role   text not null default 'all' check (for_role in ('all', 'user', 'seller', 'admin')),
  max_uses   integer check (max_uses is null or max_uses > 0), -- null = unlimited
  position   integer not null default 0,
  active     boolean not null default true
);

comment on column quick_replies.for_role is
  'Who sees this button in a chat: the buyer side (user), the seller side
   of that same thread, admin, or all three.';
comment on column quick_replies.max_uses is
  'Max times this can be tapped inside one conversation before it
   disables there — counted client-side from that thread''s own message
   history, not a stored counter. Null means unlimited.';

alter table quick_replies enable row level security;
create policy quick_replies_read  on quick_replies for select to authenticated using (true);
create policy quick_replies_admin on quick_replies for all    to authenticated
  using (is_admin()) with check (is_admin());

-- Seed with the exact defaults that were hardcoded, so nothing regresses
-- for anyone mid-conversation when this ships.
insert into quick_replies (text, for_role, position) values
  ('👋 Hi,',        'all',  1),
  ('Credentials ?', 'user', 2),
  ('Validity ?',    'user', 3),
  ('OTP ?',         'user', 4),
  ('Thank you!',    'all',  5);
