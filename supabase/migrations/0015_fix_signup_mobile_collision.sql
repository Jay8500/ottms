-- ════════════════════════════════════════════════════════════════════════
--  0015 — stop blank mobiles colliding on sign-up
--
--  handle_new_user() fell back to '' when no mobile was supplied, and
--  profiles.mobile is UNIQUE. The first such user took the empty string and
--  every one after failed with a duplicate-key error.
--
--  The app always sends a mobile, so real sign-ups were unaffected — but a
--  user created from the Supabase dashboard, or through any future social
--  login, would hit this. Found by the money smoke test.
-- ════════════════════════════════════════════════════════════════════════

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_mobile text;
begin
  v_mobile := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'mobile',
    new.phone,
    ''
  )), '');

  -- No mobile given: park a unique placeholder rather than an empty string.
  -- Obviously not a phone number, so it shows up in any audit, and it keeps
  -- the UNIQUE constraint meaningful instead of blocking the whole table.
  if v_mobile is null then
    v_mobile := 'pending:' || replace(new.id::text, '-', '');
  end if;

  insert into profiles (id, unique_number, name, mobile, email)
  values (
    new.id,
    nextval('profile_unique_number_seq'),
    coalesce(new.raw_user_meta_data ->> 'name', 'User'),
    v_mobile,
    new.email
  );
  return new;
end $$;

-- Any rows already carrying a blank mobile get the same treatment, so the
-- constraint is clean going forward.
update profiles
   set mobile = 'pending:' || replace(id::text, '-', '')
 where btrim(coalesce(mobile, '')) = '';

-- A real mobile is 10 digits; the placeholder is deliberately not. This
-- stops a blank slipping back in through a direct insert.
alter table profiles
  add constraint profiles_mobile_not_blank
  check (btrim(mobile) <> '');
