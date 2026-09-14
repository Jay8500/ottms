-- Read-only. Shows every sign-up field in the order the app renders them,
-- so we can see if an unusual one was added through Form Builder.
select position, label, placeholder, field_type, required, enabled, system
  from form_fields
 order by position;
