-- ════════════════════════════════════════════════════════════════════════
--  0041 — Seller mode actually gates listing a screen
--
--  Found by QA trace (SEL-01): the Profile screen's "Seller mode" switch
--  says "Share your screens and earn from unused seats", but nothing ever
--  checked it — groups_seller_insert (0002) only checked seller_id and
--  status, so anyone could list a screen with the switch off. Client's
--  call: make the switch actually required, matching its own promise.
--
--  Enforced here (server-side, so it can't be skipped by calling the API
--  directly) and in accnttype.page.ts (so the user gets a clear message
--  instead of a failed request).
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists groups_seller_insert on groups;

create policy groups_seller_insert on groups for insert to authenticated
  with check (
    seller_id = auth.uid() and status = 'pending'
    and exists (select 1 from profiles where id = auth.uid() and is_seller)
  );
