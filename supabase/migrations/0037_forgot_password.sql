-- ════════════════════════════════════════════════════════════════════════
--  0037 — Forgot Password (email OTP, not SMS)
--
--  Client sign-off: SMS needed a ₹5,900 DLT registration fee up front,
--  which he didn't want to pay just to test this. "Mail ID" has been a
--  required signup field the whole time, so email OTP via Brevo (free
--  tier, no registration fee) covers every existing user already —
--  nobody needs to add anything before this works for them.
--
--  1) Real bug, found while scoping this, unrelated to what the client
--     asked for: handle_new_user() (0001) has always saved auth.users'
--     email onto profiles.email — but that's the SYNTHETIC
--     "<mobile>@moneysaver.app" identity Supabase Auth needs internally
--     (see supabase.service.ts emailFor()), not the real address someone
--     typed into "Mail ID". The real one was captured into
--     raw_user_meta_data.real_email at signup and never used anywhere.
--     profiles.email has been the fake address for every single user
--     until this migration. Fixed going forward, and backfilled for
--     everyone already registered.
--
--  2) password_reset_otps is deliberately reachable by NOBODY except a
--     SECURITY DEFINER context — no policy grants it to `authenticated`
--     at all. Both the sending and the verifying happen entirely inside
--     the request-password-reset / confirm-password-reset Edge Functions,
--     using the service-role key, because actually changing a password
--     needs Supabase's Admin API (auth.admin.updateUserById) — there is
--     no safe way to do that from a plain client-callable RPC.
--
--  NOT fixed here, flagged separately: profiles.mobile and (now that it
--  holds something real) profiles.email are both in the "safe" column
--  list from 0032's wallet lockdown, and profiles_read is `using (true)`
--  — meaning any signed-in user can already read any other user's mobile
--  number over a plain REST call today, and will now be able to read
--  their real email too. This is the same class of problem 0032 fixed for
--  the wallet columns, on contact details instead of money. Not touched
--  in this migration — it needs the same careful, checked-against-every-
--  reader treatment 0032 got, not a rushed change bundled into an
--  unrelated feature.
-- ════════════════════════════════════════════════════════════════════════

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, unique_number, name, mobile, email)
  values (
    new.id,
    nextval('profile_unique_number_seq'),
    coalesce(new.raw_user_meta_data ->> 'name', 'User'),
    coalesce(new.raw_user_meta_data ->> 'mobile', new.phone, ''),
    nullif(new.raw_user_meta_data ->> 'real_email', '')
  );
  return new;
end $$;

-- Backfill: every existing profile still holding the synthetic address
-- gets the real one from auth metadata where it exists.
update profiles p
   set email = u.raw_user_meta_data ->> 'real_email'
  from auth.users u
 where u.id = p.id
   and nullif(u.raw_user_meta_data ->> 'real_email', '') is not null;

create table password_reset_otps (
  mobile      text primary key,
  otp_hash    text not null,
  attempts    integer not null default 0,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

comment on table password_reset_otps is
  'No RLS policy grants this to authenticated on purpose — only reachable
   from the request-password-reset / confirm-password-reset Edge
   Functions via the service-role key. One row per mobile; a new request
   overwrites the previous code rather than accumulating rows.';

alter table password_reset_otps enable row level security;
