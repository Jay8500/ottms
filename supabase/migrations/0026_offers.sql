-- ════════════════════════════════════════════════════════════════════════
--  0026 — "New Offers" on the home page
--
--  Client (round 4): "Add Home Page 'New Offers' button to Admin Panel Home
--  Page. so if any offer i will create Post like - Upload Image, Heading,
--  Description, Actual Price, Our Price, Offer Price + Selectable option of
--  Already available Item."
--
--  Same shape as every other admin-editable list in this app
--  (home_buttons, commerce_options): world-readable, admin-writable, image
--  stored inline as a data URL — that is how every other CmsEntity image
--  already works here (see EntityEditorComponent.onImage()), not something
--  new introduced for this table.
--
--  linked_ott_app_id is the "Selectable option of Already available Item" —
--  tapping the offer can jump straight to that platform. Nullable: an offer
--  is allowed to just be an announcement with nothing to link to.
-- ════════════════════════════════════════════════════════════════════════

create table offers (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  image_url       text,
  actual_price    numeric(12,2),
  our_price       numeric(12,2),
  offer_price     numeric(12,2),
  linked_ott_app_id uuid references ott_apps(id) on delete set null,
  position        integer not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create index on offers (position) where active;

alter table offers enable row level security;

create policy offers_read on offers for select to authenticated using (true);

create policy offers_admin on offers for all to authenticated
  using (is_admin()) with check (is_admin());
