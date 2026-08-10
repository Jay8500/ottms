-- ════════════════════════════════════════════════════════════════════════
--  0014 — client's round-3 answers
--
--  "as of now out Amount with Admin approval. I will share Cashfree
--   tomorrow." — so the gateway stays OFF until his KYC and webhook are
--  ready. 0012 optimistically set this to cashfree; that would show users an
--  Instant tab that cannot complete.
-- ════════════════════════════════════════════════════════════════════════

update app_settings
   set value = '"manual"'::jsonb
 where key = 'payment_gateway';

-- ── Terms skeleton ──────────────────────────────────────────────────────
-- He asked for headings he can fill in himself through Admin → Terms,
-- rather than us writing his business policy for him. Seeded only if the
-- document is still empty, so re-running never overwrites his wording.
update legal_documents
   set body =
'1. ABOUT SHAREOTTS
[Write what the app does and who runs it.]

2. WHO CAN USE IT
[Age limit, one account per person, accurate details.]

3. BUYING A SCREEN
[What the buyer gets, how long access lasts, what is not included.]

4. SELLING A SCREEN
[Seller must own the subscription. Must share working credentials.
 Must not change the password during the period.]

5. WALLET AND PAYMENTS
[How money is added, your service charge, when funds unlock.]

6. WITHDRAWALS
[Minimum amount, your fee, how long payout takes.]

7. LEAVING EARLY — PERSONAL REASON
[How much comes back to the buyer, how the rest is split.]

8. ACCOUNT NOT WORKING
[What proof is needed, what the buyer gets back,
 what penalty the seller pays.]

9. CHAT RULES
[No personal contact details. No abuse. Admin may read conversations.]

10. BREAKING THE RULES
[Warnings, suspension, holding funds, closing the account.]

11. WHAT WE ARE NOT RESPONSIBLE FOR
[Disputes between users, a streaming service changing its own rules.]

12. CONTACT
shareottssupport@gmail.com'
 where slug = 'terms'
   and btrim(coalesce(body, '')) = '';
