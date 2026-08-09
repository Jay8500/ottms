# OTT Money Saver — Complete Functionality (Final Freeze)

This covers everything the app will do, end-to-end, for all three roles — User (Buyer), Seller, and Admin. Please read through and confirm this matches what you want. Once you approve this, we start building — no more requirement changes after this point.

---

## 👤 USER (BUYER) — Complete Journey

**1. Sign Up & Login**
- Register with name, mobile, email, password, optional profile photo
- Login with mobile/email + password
- Email OTP used for password reset/verification only (not for regular login)
- Bank details / UPI ID entered once during setup — **cannot be changed later** (permanent, for fraud protection)

**2. Browsing & Buying**
- Home → pick a Category (Entertainment, Music, etc. — only Entertainment active for now) → pick an OTT app (Netflix, Prime, etc.) → pick a Validity/Plan (1/3/6/12 months) → see list of sellers offering that app+plan
- Select a seller → popup shows your current Unlocked wallet balance vs. the price (price + small service charge)
- **If your balance covers it:** instant purchase, no screenshot needed — you're added to that seller's group immediately, a private chat opens with the seller, and credentials are shared there
- **If your balance is short:** redirected to Add Fund — pay via UPI/QR, upload payment screenshot, wait for admin approval before the money reflects in your wallet

**3. Your Membership Period**
- Each seat/purchase runs for its own individual period starting from the day you joined (e.g. joined 2nd, 1-month plan = expires 2nd of next month)
- You'll get reminder notifications at 5 days, 2 days, and on the day your access is about to expire
- On expiry, you're automatically removed from the group

**4. If Something Goes Wrong (Exit Request)**
- **Changed your mind / personal reason:** you get 50% of your unused remaining amount back; the rest is split between the seller and admin
- **Account/screen actually not working (with photo proof):** you get 100% of your unused remaining amount back, and the seller is penalized 10% for selling a faulty account

**5. Wallet**
- See Locked (pending) and Unlocked (spendable/withdrawable) balances
- Add Fund: pay + screenshot + admin approval
- Withdraw: request from Unlocked balance → admin pays manually via your saved Bank/UPI within 24 hours
- Full transaction history, color-coded (Funded/Expense/Withdraw), downloadable as Excel

**6. Ratings**
- After you've actually completed a deal with someone (bought from a seller), you *can* optionally rate/badge them — not mandatory
- Sellers can also rate you back the same way

**7. Support & Extras**
- FAQ section (with videos) — English by default, Hindi/Telugu content added by you later
- WhatsApp, Call, and In-App Chat support options
- A persistent menu (top-right, all pages) with: Profile, Payments & Wallet, Bank Details, Groups, Order History, Policy, Terms, Rate Us, Logout
- Referral program — **not built in this phase**, can add later

---

## 🏪 SELLER (a mode any User can switch on) — Complete Journey

**1. Becoming a Seller**
- Any user can toggle "Seller mode" — no separate signup needed

**2. Creating a Group (Listing a screen for sale)**
- Choose an OTT app + its plan (e.g. Netflix Premium) — the number of sellable screens for that plan is fixed by admin (e.g. Premium = 4 screens max)
- Upload proof of your subscription (membership screenshot), add validity period and a comment
- Submitted to admin for approval before it goes live

**3. Running the Group**
- Once approved, your group appears in the Sellers List for buyers to find and join
- **Only one active group per app at a time** — but you can run groups for different apps simultaneously (one Netflix group + one Prime group is fine)
- As buyers join, seats fill up individually — each buyer has their own join date and expiry date, not a single shared expiry for the whole group
- When all seats are full, your group stops appearing in the Sellers List (buyers can't find you) — but your chats with existing members stay active
- When any single seat's member auto-exits (their period ends), that seat opens up again and you automatically reappear in the Sellers List for that app+plan

**4. Getting Paid**
- Every sale credits your **Locked** funds with the full amount
- Locked funds convert to **Unlocked** (withdrawable) gradually, a little each day, over the buyer's validity period
- If a buyer exits early, your locked/unlocked funds may be reduced depending on the reason (see Exit Requests above)
- Request a Withdraw from your Unlocked balance → admin pays manually (Bank/UPI) within 24 hours

**5. Ratings**
- Buyers can optionally rate/badge you after a completed deal, and you can rate them back

---

## 🛠️ ADMIN — Complete Journey

**1. Dashboard**
- Quick stats: total users, active sellers, active screens, total revenue

**2. Approvals (the daily workflow)**
- **Group Approvals:** review a seller's new group listing + proof screenshot → approve or reject
- **Payment Approvals:** review a buyer's Add Fund screenshot → approve (credits their wallet) or reject
- **Withdraw requests:** review, pay the person manually outside the app, then upload a screenshot as proof and mark it complete
- **Exit Requests:** review a buyer's exit request (personal reason or technical fault with photos) → apply the correct refund/penalty split

**3. Management**
- **User Management:** view, edit, or remove user accounts
- **Category & App Management:** add/edit/remove categories, OTT apps, and set the seat limits per app+plan (e.g. Netflix Premium = 4 screens)
- **Content & Support:** edit FAQs (with multi-language text/video), contact details, suggested chat quick-replies, promotional offers

**4. Admin's Own Earnings**
- Every purchase's service charge goes straight to Admin's own wallet
- Every exit-penalty from a faulty-account seller also goes to Admin's wallet
- Admin can withdraw this like anyone else
- The exact service charge % is configurable in settings (you'll confirm the number)

---

## Cross-Cutting Features (all roles)
- Real-time chat (1-on-1 only — even in a shared group, each buyer chats with the seller separately, not all together)
- Online/offline status shown for sellers, based on whether they have the app open
- Push notifications for: payment received, payment approved, group approved, new chat message, group membership added, and expiry reminders (5/2/0 days)
- Offline banner if internet drops — money actions (Purchase/Withdraw/Add Fund) are disabled until connection returns, browsing/chat still works
- Excel export of transaction history

---

**Please confirm:** does this match your understanding of how the app should work, end to end? If anything here is wrong or missing, let me know now — once approved, this becomes the final spec and development begins.
