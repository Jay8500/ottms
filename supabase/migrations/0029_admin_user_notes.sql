-- ════════════════════════════════════════════════════════════════════════
--  0029 — admin's private notes on a user
--
--  Client (round 5): "Admin - I can able to add notes because i need to
--  make note on them" (while looking at a chat).
--
--  One free-text note per user, admin-only in both directions — never
--  world-readable like the catalog tables, and never shown to the user
--  themselves.
-- ════════════════════════════════════════════════════════════════════════

create table user_notes (
  user_id    uuid primary key references profiles(id) on delete cascade,
  note       text not null default '',
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table user_notes enable row level security;

create policy user_notes_admin on user_notes for all to authenticated
  using (is_admin()) with check (is_admin());
