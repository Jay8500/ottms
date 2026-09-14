-- ════════════════════════════════════════════════════════════════════════
--  0022 — storage upload policies (SECURITY / BUG FIX)
--
--  supabase/README.md always said to create 5 buckets by hand in the
--  dashboard, but no migration ever added a policy on storage.objects. A
--  bucket with no policy accepts no writes from an ordinary signed-in user
--  — Storage defaults closed, the same way table RLS does.
--
--  This is very likely why the client reported, on the first real device
--  test:
--    "Not able to Create Group - Showing dont have permission"
--    "Not able to Submit Payment after Payment - Showing not having permission"
--  Both actions upload a screenshot before writing their row. Confirm with
--  supabase/scripts/check_storage.sql; this migration is safe to run either
--  way — it only adds policies, it does not touch bucket existence.
--
--  Every upload path in the app is prefixed by an id that tells us who owns
--  it (checked in data.service.ts on 2026-08-13):
--    payment-proofs   {user_id}/...
--    group-proofs     {seller_id}/...              (listing a screen)
--                     exits/{user_id}/...           (faulty-exit claim)
--    chat-images      {thread_id}/...               — not a user id; ownership
--                     is "am I one of the two people in this thread"
--    support-videos   admin-managed, not yet built; policy added ready for it
--    avatars          {user_id}/... — added 2026-08-13 once the upload was
--                     rebuilt. avatar_url is not rendered anywhere else in
--                     the app yet, so private (owner + admin only) is safe;
--                     revisit if avatars are ever shown to other users.
-- ════════════════════════════════════════════════════════════════════════

-- ── payment-proofs: add-fund screenshots ───────────────────────────────
create policy "payment-proofs: owner uploads to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "payment-proofs: owner and admin can view"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

-- ── group-proofs: seller's subscription screenshot, and exit-claim photos ─
create policy "group-proofs: owner uploads to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'group-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or ((storage.foldername(name))[1] = 'exits'
          and (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

create policy "group-proofs: owner and admin can view"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'group-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or ((storage.foldername(name))[1] = 'exits'
          and (storage.foldername(name))[2] = auth.uid()::text)
      or is_admin()
    )
  );

-- ── chat-images: keyed by thread, not by user ──────────────────────────
-- Both participants may post into and read their own thread's folder.
-- Admin can read every thread, matching "admin can read all chats" (0009).
create policy "chat-images: a participant can post in their thread"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and exists (
      select 1 from chat_threads t
       where t.id::text = (storage.foldername(name))[1]
         and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

create policy "chat-images: a participant or admin can view"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-images'
    and (
      is_admin()
      or exists (
        select 1 from chat_threads t
         where t.id::text = (storage.foldername(name))[1]
           and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
      )
    )
  );

-- ── support-videos: admin-managed FAQ explainer clips ──────────────────
-- Upload not built yet (cntnorspptmngmnt.page.ts:136 is a stub message).
-- Added now so the feature has somewhere to land: every signed-in user may
-- watch, only admin may upload.
create policy "support-videos: everyone signed in can watch"
  on storage.objects for select to authenticated
  using (bucket_id = 'support-videos');

create policy "support-videos: only admin uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'support-videos' and is_admin());

create policy "support-videos: only admin replaces or removes"
  on storage.objects for update to authenticated
  using (bucket_id = 'support-videos' and is_admin());

create policy "support-videos: only admin deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'support-videos' and is_admin());

-- ── avatars: profile photo ──────────────────────────────────────────────
create policy "avatars: owner uploads to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: owner may replace their own photo"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner and admin can view"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

-- ── Admin can manage anything in the three user buckets too ────────────
-- Covers removing an inappropriate screenshot etc.
create policy "user-content buckets: admin manages everything"
  on storage.objects for all to authenticated
  using (
    bucket_id in ('payment-proofs', 'group-proofs', 'chat-images', 'avatars')
    and is_admin()
  )
  with check (
    bucket_id in ('payment-proofs', 'group-proofs', 'chat-images', 'avatars')
    and is_admin()
  );
