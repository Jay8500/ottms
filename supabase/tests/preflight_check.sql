-- ════════════════════════════════════════════════════════════════════════
--  PREFLIGHT CHECK
--
--  Read-only. Verifies the LIVE database matches what the app expects —
--  which the migration files cannot tell you, because a migration may have
--  been skipped, half-run, or run out of order.
--
--  Run it after any migration, and again before handing a build to anyone.
--  Everything must say PASS. It writes nothing, so it is safe at any time.
--
--  What it does NOT cover: whether a real signed-in user is blocked from
--  admin screens. That needs the app on a phone.
-- ════════════════════════════════════════════════════════════════════════

with

-- ── 1. Every RPC the Angular app calls, from data.service.ts ────────────
expected_rpc(fn) as (values
  ('purchase_screen'), ('request_withdraw'), ('request_exit'),
  ('approve_exit_request'), ('reject_exit_request'),
  ('approve_add_fund'), ('reject_add_fund'),
  ('approve_withdraw'), ('reject_withdraw'),
  ('approve_bank_change'), ('reject_bank_change'),
  ('adjust_balance'), ('set_media_unlock'), ('set_presence'),
  ('redeem_referral'), ('my_referral_code'),
  ('setting_num'), ('setting_text')
),

-- ── 2. Functions a signed-in user must NOT be able to call ──────────────
-- post_ledger writes balances directly. exit_membership hands out refunds
-- without admin review. credit_paid_order invents wallet money.
forbidden_rpc(fn) as (values
  ('post_ledger'), ('exit_membership'), ('credit_paid_order'),
  ('fail_order'), ('settle_daily_unlock'), ('expire_memberships'),
  ('sweep_presence'), ('admin_user_id')
),

fn_state as (
  select p.proname,
         bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
           as authenticated_may_call
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
   group by p.proname
),

results as (

  -- exists and is callable by the app
  select 1 as ord,
         'app RPC: ' || e.fn as check_name,
         case when s.proname is null then 'FAIL'
              when not s.authenticated_may_call then 'FAIL'
              else 'PASS' end as outcome,
         case when s.proname is null then 'MISSING — a migration did not run'
              when not s.authenticated_may_call
                then 'exists but authenticated cannot execute it'
              else 'present and callable' end as detail
    from expected_rpc e
    left join fn_state s on s.proname = e.fn

  union all

  -- exists but must be out of reach
  select 2,
         'locked down: ' || f.fn,
         case when s.proname is null then 'PASS'
              when s.authenticated_may_call then 'FAIL'
              else 'PASS' end,
         case when s.proname is null then 'not present'
              when s.authenticated_may_call
                then 'REACHABLE BY ANY SIGNED-IN USER — revoke it'
              else 'revoked' end
    from forbidden_rpc f
    left join fn_state s on s.proname = f.fn

  union all

  -- ── 2b. Anything SECURITY DEFINER that nobody approved ────────────────
  -- The named list above only covers what someone thought to list. This
  -- sweep asks the database instead: every SECURITY DEFINER function runs
  -- with owner privileges and bypasses RLS, so any one of them reachable by
  -- `authenticated` and not on the allowlist is a new back door.
  --
  -- This is what would have caught 0011's failed revoke on day one.
  -- Trigger functions are excluded — they cannot be called directly.
  select 2,
         'unexpected definer fn: ' || p.proname,
         'FAIL',
         'SECURITY DEFINER and callable by any signed-in user — '
           || 'revoke it, or add it to the allowlist if it is meant to be public'
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.prosecdef
     and p.prorettype <> 'trigger'::regtype
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')
     and p.proname not in (select fn from expected_rpc)
     -- RLS policies call these, so they must stay reachable.
     and p.proname not in ('is_admin', 'is_thread_participant')

  union all

  -- ── 3. RLS on every table ─────────────────────────────────────────────
  -- The publishable key ships inside the APK. It is only safe because RLS
  -- stands between it and the data. One table without RLS is a public table.
  select 3,
         'RLS enabled: ' || c.relname,
         case when c.relrowsecurity then 'PASS' else 'FAIL' end,
         case when c.relrowsecurity then 'on'
              else 'OFF — readable by anyone holding the app key' end
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'

  union all

  -- ── 4. RLS on, but no policy, means nobody can read it ────────────────
  -- Silent breakage: the screen just shows nothing, with no error.
  select 4,
         'has a policy: ' || c.relname,
         case when count(pol.polname) > 0 then 'PASS' else 'FAIL' end,
         case when count(pol.polname) > 0
              then count(pol.polname) || ' policies'
              else 'RLS on with NO policy — every read returns empty' end
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_policy pol on pol.polrelid = c.oid
   where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
   group by c.relname

  union all

  -- ── 5. The exit split must total 100% or money leaks on every exit ────
  select 5,
         'exit split totals 100%',
         case when coalesce(setting_num('exit_personal_refund_pct'), 0)
                 + coalesce(setting_num('exit_personal_seller_pct'), 0)
                 + coalesce(setting_num('exit_personal_admin_pct'), 0) = 100
              then 'PASS' else 'FAIL' end,
         format('%s buyer + %s seller + %s admin',
                setting_num('exit_personal_refund_pct'),
                setting_num('exit_personal_seller_pct'),
                setting_num('exit_personal_admin_pct'))

  union all

  -- ── 6. Which payment route is live right now ──────────────────────────
  select 6,
         'payment gateway mode',
         'INFO',
         coalesce(setting_text('payment_gateway'), 'not set')
           || ' — "manual" means UPI screenshot, "cashfree" means instant'
)

-- Verdict first, then anything that failed, then the informational line,
-- then everything that passed.
select outcome, check_name, detail
  from (
    select 0 as sort,
           case when exists (select 1 from results where outcome = 'FAIL')
                then 'FAIL' else 'PASS' end as outcome,
           '═══ PREFLIGHT ═══' as check_name,
           format('%s checks, %s failed',
                  (select count(*) from results),
                  (select count(*) from results where outcome = 'FAIL')) as detail
    union all
    select case outcome when 'FAIL' then 1 when 'INFO' then 2 else 3 end,
           outcome, check_name, detail
      from results
  ) t
 order by sort, check_name;
