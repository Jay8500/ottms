-- ════════════════════════════════════════════════════════════════════════
--  0005 — let the sign-up screen read its own configuration
--
--  form_fields decides what the registration form shows, so it must be
--  readable BEFORE the user has an account. Everything else stays behind
--  authentication.
-- ════════════════════════════════════════════════════════════════════════

create policy form_fields_anon_read on form_fields
  for select to anon using (true);

-- The login and register screens show branding and legal text too.
create policy legal_anon_read on legal_documents
  for select to anon using (true);

comment on policy form_fields_anon_read on form_fields is
  'Sign-up form config is public by necessity — it contains no user data.';