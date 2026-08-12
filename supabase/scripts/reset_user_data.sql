-- ════════════════════════════════════════════════════════════════════════
--  RESET USER DATA — DESTRUCTIVE, CANNOT BE UNDONE
--
--  Wipes every account and everything people did, so the client starts on a
--  clean app. Keeps all of your configuration and catalogue.
--
--  DELETED                          KEPT
--  ────────────────────────         ────────────────────────
--  every user account               app_settings (money rules)
--  profiles                         ott_apps, ott_plan_tiers
--  groups and memberships           categories, validity_plans
--  wallet transactions              plan_prices, commerce_options
--  wallet ledger                    form_fields, home_buttons
--  bank details                     faqs and translations
--  chats and messages               legal_documents (Terms)
--  ratings, badges awarded          social_links, payment_config
--  exit requests, referrals         notification_rules, badges
--  payment orders, device tokens
--
--  YOUR OWN ADMIN ACCOUNT IS DELETED TOO. After running this there is no
--  admin at all. Create one immediately — register in the app, then run the
--  UPDATE at the bottom of this file.
--
--  Member numbers restart from 100.
--
--  NOT covered: files already uploaded to Supabase Storage (avatars, chat
--  photos, payment screenshots). Those stay. Clear them from
--  Dashboard → Storage if you want them gone too.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- wallet_ledger refuses deletes on purpose — it is an append-only audit
-- trail. Switching the guard off is safe here only because we are removing
-- every row it protects. It goes back on before this transaction commits.
alter table wallet_ledger disable trigger wallet_ledger_immutable;

-- Children first. Most of these would cascade anyway, but
-- wallet_transactions.decided_by has no ON DELETE rule, so an ordered
-- delete avoids a foreign-key error part way through.
delete from chat_messages;
delete from chat_threads;
delete from ratings;
delete from badge_awards;
delete from exit_requests;
delete from group_members;
delete from wallet_ledger;
delete from payment_orders;
delete from wallet_transactions;
delete from bank_change_requests;
delete from bank_details;
delete from referrals;
delete from device_tokens;
delete from groups;

-- profiles and every remaining child disappear with the account.
delete from auth.users;

alter table wallet_ledger enable trigger wallet_ledger_immutable;

-- Fresh member numbers for the client's users.
alter sequence profile_unique_number_seq restart with 100;

commit;

-- ── What is left ────────────────────────────────────────────────────────
-- Users should be 0. Everything else should still have your content.
select 'users'          as item, count(*) as rows from profiles
union all select 'groups',            count(*) from groups
union all select 'transactions',      count(*) from wallet_transactions
union all select 'chats',             count(*) from chat_threads
union all select '── kept below ──',  null
union all select 'OTT platforms',     count(*) from ott_apps
union all select 'plan tiers',        count(*) from ott_plan_tiers
union all select 'validity plans',    count(*) from validity_plans
union all select 'categories',        count(*) from categories
union all select 'home buttons',      count(*) from home_buttons
union all select 'form fields',       count(*) from form_fields
union all select 'FAQs',              count(*) from faqs
union all select 'settings',          count(*) from app_settings
order by 1;

-- ════════════════════════════════════════════════════════════════════════
--  AFTER THIS: create the admin
--
--  1. Open the app and register normally with the client's number.
--  2. Run the line below.
--  3. Log out and back in — the admin panel appears.
--
--  Do it through the app, not with SQL. A Supabase login needs matching
--  rows in two internal tables; hand-written SQL can produce an account
--  that looks correct in the database but cannot sign in.
-- ════════════════════════════════════════════════════════════════════════

-- update profiles set role = 'admin' where mobile = '9059542610';
-- select unique_number, name, mobile, role from profiles;
