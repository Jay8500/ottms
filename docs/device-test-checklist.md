# Device test checklist

Nothing in this app has ever run on a phone. The database is now verified by
`supabase/tests/money_smoke_test.sql`, but that test runs as `postgres`, where
`is_admin()` is always true — so **permissions are still unproven**. That is
what section 2 is for, and it matters more than the rest.

Work through it in order. For each failure note **what you did, what you
expected, what happened** — that is usually enough for me to find it without
a screen recording.

You need two accounts. Register a second user (any mobile number) and make
one of them a seller.

---

## 1. Getting in

| # | Do this | Expect |
|---|---|---|
| 1.1 | Register a new user | Lands on the home screen, wallet ₹0 |
| 1.2 | Force-close the app, reopen | Still logged in, no login screen |
| 1.3 | Reopen after a few hours | Still logged in, back where you left off |
| 1.4 | Log out, force-close, reopen | Login screen, *not* the home screen |

1.2 is the one that breaks quietly. If it shows the login screen every time,
the session is not persisting and I need to know immediately.

## 2. Permissions — the important one

Do all of this as an **ordinary user**, never the admin.

| # | Do this | Expect |
|---|---|---|
| 2.1 | Look for any admin tab or menu | Not visible anywhere |
| 2.2 | Open the wallet | Only your own money, no one else's |
| 2.3 | Open a chat | Only your own conversations |

If an ordinary user can see an admin screen, stop testing and tell me. That
is the one class of bug the database test cannot catch.

## 3. Money

Use the two accounts. Seller lists a screen, buyer buys it.

| # | Do this | Expect |
|---|---|---|
| 3.1 | Buy with an empty wallet | Clear message about low balance, no crash, no half-purchase |
| 3.2 | Add funds (manual UPI) | Goes to "pending admin approval", balance unchanged |
| 3.3 | Approve it as admin | Balance rises by the right amount |
| 3.4 | Buy a screen | Buyer's balance drops by price + 2%; seller sees the money as *held*, not spendable |
| 3.5 | Try to withdraw before adding bank details | Refused, and tells you to add them |
| 3.6 | Request a withdrawal | Held immediately, shows as pending |
| 3.7 | Leave a group early, personal reason | Refund arrives at once, seat closes |
| 3.8 | Claim a faulty account | Goes to admin review, **no money moves yet** |

3.8 is the one a dishonest buyer would attack. If money arrives before an
admin approves, that is serious.

## 4. Back button

Android hardware back, on a real device.

| # | Do this | Expect |
|---|---|---|
| 4.1 | Open a popup, press back | Popup closes, page stays |
| 4.2 | Open a sheet, press back | Sheet closes, page stays |
| 4.3 | Go three pages deep, press back three times | Walks back one page at a time |
| 4.4 | Press back on the home screen | "Press again to exit", then exits on a second press |

## 5. No internet

Turn on aeroplane mode.

| # | Do this | Expect |
|---|---|---|
| 5.1 | Open the app offline | Tells you there is no connection; does not hang on a spinner |
| 5.2 | Try to buy something offline | Plain-English failure, no raw error text |
| 5.3 | Turn the internet back on | Recovers without a restart |

Watch for anything containing `supabase.co`, `relation "`, or `column "` —
those are database errors leaking to the user, and I want to hear about any.

## 6. Chat

| # | Do this | Expect |
|---|---|---|
| 6.1 | Message the other account | Arrives without refreshing |
| 6.2 | Send a phone number or email | Blocked or masked |
| 6.3 | Send a photo before the seller unlocks media | Refused |

## 7. Notifications

| # | Do this | Expect |
|---|---|---|
| 7.1 | First launch | Asks permission once |
| 7.2 | Trigger something notifiable with the app closed | Notification arrives |
| 7.3 | Tap it | Opens the right screen, not just the home screen |

Push needs the Firebase key set as an Edge Function secret. If 7.2 never
arrives, check that before assuming the app is at fault.

## 8. Look and feel

Less critical, but note anything you see.

- Buttons all reachable with a thumb, nothing under the system nav bar
- No text cut off or overlapping
- Every action gives feedback — spinner, toast, something
- Nothing shifts position after the page loads
- Rotate the screen once and check nothing breaks

---

## Known, already decided

Not bugs — no need to report these:

- OTT logos are placeholders, not the real brand marks
- Prices are samples until the client sends real ones
- Terms & Conditions is a skeleton the client fills in himself
- "Add funds" is manual UPI; the instant option stays off until Cashfree KYC
  clears

## Open question for the client

On a **faulty-account** exit the buyer does not get the 2% service charge
back — the refund is capped at what the seller holds, and admin has already
taken its fee. On a ₹400 screen the buyer is short ₹5.33. Personal exits are
unaffected. He needs to decide: refund the fee on faulty claims, or state in
the T&C that it is non-refundable.
