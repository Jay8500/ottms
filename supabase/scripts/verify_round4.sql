-- ════════════════════════════════════════════════════════════════════════
--  VERIFY ROUND-4 MIGRATIONS LANDED (0022-0027)
--
--  Read-only. Confirms the actual objects exist, rather than trusting the
--  push command's exit message.
-- ════════════════════════════════════════════════════════════════════════

select 'storage policy: payment-proofs insert' as check, count(*) as found
  from pg_policies where tablename='objects' and policyname like 'payment-proofs%'
union all
select 'storage policy: avatars insert', count(*)
  from pg_policies where tablename='objects' and policyname like 'avatars%'
union all
select 'storage policy: support-videos', count(*)
  from pg_policies where tablename='objects' and policyname like 'support-videos%'
union all
select 'bank_details.payment_app column', count(*)
  from information_schema.columns
 where table_name='bank_details' and column_name='payment_app'
union all
select 'app_settings: support_inapp_chat_enabled', count(*)
  from app_settings where key='support_inapp_chat_enabled'
union all
select 'app_settings: support_lang_hi_enabled', count(*)
  from app_settings where key='support_lang_hi_enabled'
union all
select 'ott_apps.instructions column', count(*)
  from information_schema.columns
 where table_name='ott_apps' and column_name='instructions'
union all
select 'offers table exists', count(*)
  from information_schema.tables where table_name='offers'
union all
select 'function: get_or_create_support_thread', count(*)
  from pg_proc where proname='get_or_create_support_thread'
union all
select 'chat_threads_one_support_thread index', count(*)
  from pg_indexes where indexname='chat_threads_one_support_thread';
