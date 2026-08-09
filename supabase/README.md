# Supabase setup

## Running the migrations

Supabase Dashboard → SQL Editor → New query. Paste and run **in order**:

1. `migrations/0001_schema.sql` — tables, enums, indexes, settings
2. `migrations/0002_rls.sql` — Row Level Security on every table
3. `migrations/0003_functions.sql` — money functions
4. `seed.sql` — catalog data

Each file is safe to read top to bottom before running. Nothing drops anything.

## Making yourself admin

Sign up through the app first, then:

```sql
update profiles set role = 'admin' where mobile = '<your mobile>';
```

`admin_user_id()` picks the oldest admin as the account that receives service
charges and penalties, so create your own admin account before taking payments.

## Filling in the client's answers

Every money rule is a row in `app_settings` — no code change, no deploy:

```sql
update app_settings set value = '5'::jsonb        where key = 'service_charge_pct';
update app_settings set value = '"buyer"'::jsonb  where key = 'service_charge_payer';
update app_settings set value = '5'::jsonb        where key = 'withdraw_fee_pct';
update app_settings set value = '100'::jsonb      where key = 'withdraw_min';
update app_settings set value = '12'::jsonb       where key = 'withdraw_sla_hours';
```

The three exit-split percentages are guarded by a deferred constraint trigger —
they must total 100, so change them together in one transaction:

```sql
begin;
update app_settings set value = '50'::jsonb where key = 'exit_personal_refund_pct';
update app_settings set value = '30'::jsonb where key = 'exit_personal_seller_pct';
update app_settings set value = '20'::jsonb where key = 'exit_personal_admin_pct';
commit;
```

Anything that does not add up to 100 is rejected at `commit`. That is deliberate:
a split that does not total 100 quietly loses money on every early exit.

## Scheduled jobs

Two functions need to run daily. Database → Extensions → enable `pg_cron`, then:

```sql
select cron.schedule('daily-unlock', '0 1 * * *', $$ select settle_daily_unlock() $$);
select cron.schedule('expire-members', '30 1 * * *', $$ select expire_memberships() $$);
```

- `settle_daily_unlock()` moves each seller's held funds to spendable, pro-rata
  across the buyer's validity period.
- `expire_memberships()` ends finished seats and puts the seller back in the
  sellers list when a seat frees up.

## Storage buckets

Create these under Storage, all **private**:

| Bucket | Holds |
|---|---|
| `payment-proofs` | Add-fund screenshots |
| `group-proofs` | Seller subscription screenshots |
| `avatars` | Profile photos |
| `chat-images` | Photos sent in chat |
| `support-videos` | FAQ explainer videos |

Public buckets would expose payment screenshots to anyone with a URL.

## What is not settled yet

`plan_prices` is seeded with the **mockup** figures (₹50 / 99 / 170 / 250) as a
placeholder — questionnaire D1 is unanswered. `service_charge_pct`,
`withdraw_fee_pct` and `withdraw_min` are all seeded at **0** deliberately, so
nothing silently charges a user a rate nobody approved.

There is no `referrals` table. Questionnaire K1 asks whether the referral
programme is in this phase at all; the freeze doc says it is not.

## Design notes

**Money is `numeric(12,2)`, never float.** Splits round explicitly and the
remainder goes to admin, so rupees are never created or destroyed by rounding.

**`wallet_ledger` is append-only** — a trigger blocks UPDATE and DELETE. Balances
on `profiles` are a denormalised convenience; if the two ever disagree, the
ledger is the truth. Correct mistakes with a compensating entry, not an edit.

**Balances only change inside SECURITY DEFINER functions.** `post_ledger()` is
revoked from clients entirely. The `CHECK (>= 0)` constraints on `profiles` mean
an overdraw raises and rolls back the whole transaction rather than going
negative.

**Withdrawals hold funds at request time**, moving them from unlocked to locked,
so the same balance cannot be withdrawn twice or spent while a payout is pending.

**Admin cannot read chat messages** unless `chat_threads.reported` is true. This
matches the privacy notice shown to users in-chat. Questionnaire K3 asks the
client to confirm; if they want unrestricted access, change the `messages_read`
policy in `0002`.