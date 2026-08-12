-- ════════════════════════════════════════════════════════════════════════
--  0020 — stop a user editing their own role and balance (SECURITY)
--
--  0002 created:
--
--      create policy profiles_self_edit on profiles for update
--        to authenticated
--        using (id = auth.uid()) with check (id = auth.uid());
--
--  It says who may update, but never says WHICH COLUMNS. So a signed-in
--  user could change any field in their own row:
--
--      update profiles set role = 'admin'        where id = auth.uid();
--      update profiles set wallet_unlocked = 999999 where id = auth.uid();
--
--  Either one is game over. The first hands over the whole admin panel —
--  every user, every payout, every setting. The second prints money.
--
--  0004 added a stricter admin policy that protects the balance columns,
--  but Postgres combines permissive policies with OR, so this looser one
--  still allowed the write. The strict policy gave a false sense of safety.
--
--  Only the app screens were safe, and only because they happen not to send
--  those fields. Nothing stopped a direct API call. The key needed for that
--  call ships inside the APK, so this was reachable by anyone with the app.
--
--  The fix keeps self-edit working for the fields a user should own (name,
--  nickname, avatar, mobile, is_seller) and pins the rest to their current
--  values.
--
--  The money RPCs are unaffected. They are SECURITY DEFINER owned by
--  postgres, and RLS does not apply to the table owner, so post_ledger goes
--  on writing balances exactly as before.
--
--  Found while answering "can the client register himself as admin?".
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists profiles_self_edit on profiles;

create policy profiles_self_edit on profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()

    -- You cannot promote yourself.
    and role = (select p.role from profiles p where p.id = profiles.id)

    -- You cannot pay yourself. Balances move only through the ledger RPCs.
    and wallet_locked =
        (select p.wallet_locked from profiles p where p.id = profiles.id)
    and wallet_unlocked =
        (select p.wallet_unlocked from profiles p where p.id = profiles.id)

    -- Your member number is your identity to other users; it is not yours
    -- to rewrite.
    and unique_number =
        (select p.unique_number from profiles p where p.id = profiles.id)
  );

comment on policy profiles_self_edit on profiles is
  'A user may edit their own name, nickname, avatar, mobile and seller flag. Role, balances and member number are pinned to their existing values.';
