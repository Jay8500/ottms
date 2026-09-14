-- Fixes the live blocker: a text field asking users to type an answer to
-- "Upload any photo" was marked required, so no signup could ever pass
-- validation. Form Builder has no real upload field type — text/tel/
-- email/password only — so this was never going to work as a text field.
update form_fields set enabled = false where label = 'Profile Photo';

-- Cosmetic: an unfinished placeholder ("Avai") on the optional City field.
update form_fields set placeholder = 'City' where label = 'City';

-- Was forced required; not part of the original setup.
update form_fields set required = false where label = 'Nick Name';

-- Confirm the result.
select position, label, placeholder, field_type, required, enabled
  from form_fields
 order by position;
