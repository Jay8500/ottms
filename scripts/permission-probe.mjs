/**
 * PERMISSION PROBE
 *
 *   node scripts/permission-probe.mjs
 *
 * Signs in as an ordinary user and tries to do things an ordinary user must
 * not be able to do. Every attempt must fail.
 *
 * WHY THIS IS A SCRIPT AND NOT SQL
 *   The obvious approach — become a normal user inside the SQL Editor — does
 *   not work on Supabase:
 *
 *     SET ROLE authenticated
 *       changes current_user but not session_user, and is_admin() starts
 *       with `session_user in ('postgres','supabase_admin')`. The attacker
 *       stays an admin and every check passes for the wrong reason.
 *
 *     SET SESSION AUTHORIZATION authenticated
 *       would change both, but Supabase's postgres role is not a superuser:
 *       "permission denied to set session authorization".
 *
 * So this goes through the front door instead: the publishable key and a
 * real signed-in session, exactly what the phone uses and exactly what an
 * attacker would use. It is a more honest test than the SQL ever was — it
 * exercises PostgREST, the JWT, and RLS together.
 *
 * SAFE: it only ever tries to write; if the rules hold, nothing changes. It
 * creates one throwaway account, and prints how to delete it at the end.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ── Config, read from the app's own environment file ──────────────────────
const env = readFileSync('src/environments/environment.ts', 'utf8');
const url = env.match(/supabaseUrl:\s*'([^']+)'/)?.[1];
const key = env.match(/supabaseKey:\s*'([^']+)'/)?.[1];

if (!url || !key) {
  console.error('Could not read supabaseUrl / supabaseKey from src/environments/environment.ts');
  process.exit(1);
}

// A throwaway account. Same mobile every run, so repeats reuse it.
const MOBILE = '9000000001';
const PASSWORD = 'probe-only-account';
const EMAIL = `${MOBILE}@moneysaver.app`;

const results = [];
const record = (step, ok, detail) => results.push({ step, ok, detail });

/**
 * Runs one attack. `check` returns true when the attack was STOPPED.
 * An error is normally a pass — being refused is the point.
 */
async function attack(step, fn) {
  try {
    const { stopped, detail } = await fn();
    record(step, stopped, detail);
  } catch (e) {
    record(step, true, `refused: ${String(e.message ?? e).slice(0, 70)}`);
  }
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Probing ${url}\n`);

// ── Sign in, creating the account the first time ──────────────────────────
let me;
{
  let { data, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });

  if (error) {
    const up = await sb.auth.signUp({
      email: EMAIL,
      password: PASSWORD,
      options: { data: { name: 'Permission Probe', mobile: MOBILE } },
    });
    if (up.error) {
      console.error('Could not create the probe account:', up.error.message);
      process.exit(1);
    }
    ({ data, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD }));
    if (error) {
      console.error('Created the account but could not sign in:', error.message);
      process.exit(1);
    }
  }
  me = data.user.id;
}

// Sanity: the probe must not be an admin, or nothing below means anything.
{
  const { data } = await sb.from('profiles').select('role, name').eq('id', me).maybeSingle();
  const isUser = data?.role === 'user';
  record(
    'the probe account is an ordinary user',
    isUser,
    isUser ? "role is 'user' — results below are meaningful"
           : `role is '${data?.role}' — IGNORE EVERY RESULT BELOW`,
  );
  if (!isUser) {
    report();
    process.exit(1);
  }
}

// ══ 1. Promote myself to admin ════════════════════════════════════════════
// PostgREST reports success with zero rows when RLS filters the row out, so
// never trust the response — read the value back.
await attack('cannot make myself admin', async () => {
  await sb.from('profiles').update({ role: 'admin' }).eq('id', me);
  const { data } = await sb.from('profiles').select('role').eq('id', me).maybeSingle();
  return { stopped: data?.role === 'user', detail: `role is now '${data?.role}'` };
});

// ══ 2. Pay myself ═════════════════════════════════════════════════════════
await attack('cannot top up my own wallet', async () => {
  await sb.from('profiles').update({ wallet_unlocked: 999999 }).eq('id', me);
  const { data } = await sb.from('profiles').select('wallet_unlocked').eq('id', me).maybeSingle();
  return { stopped: Number(data?.wallet_unlocked) !== 999999,
           detail: `balance is ${data?.wallet_unlocked}` };
});

// ══ 3. Give myself a free member number ═══════════════════════════════════
await attack('cannot change my member number', async () => {
  const before = (await sb.from('profiles').select('unique_number').eq('id', me).maybeSingle())
    .data?.unique_number;
  await sb.from('profiles').update({ unique_number: 1 }).eq('id', me);
  const after = (await sb.from('profiles').select('unique_number').eq('id', me).maybeSingle())
    .data?.unique_number;
  return { stopped: before === after, detail: `still ${after}` };
});

// ══ 4. Read everyone's bank details ═══════════════════════════════════════
await attack("cannot read other people's bank details", async () => {
  const { data } = await sb.from('bank_details').select('user_id, account_no, upi_id');
  const others = (data ?? []).filter((r) => r.user_id !== me);
  return { stopped: others.length === 0,
           detail: others.length ? `SAW ${others.length} OTHER ACCOUNTS` : 'sees none' };
});

// ══ 5. Read everyone's money ══════════════════════════════════════════════
await attack("cannot read other people's transactions", async () => {
  const { data } = await sb.from('wallet_transactions').select('user_id, amount');
  const others = (data ?? []).filter((r) => r.user_id !== me);
  return { stopped: others.length === 0,
           detail: others.length ? `SAW ${others.length} OTHER TRANSACTIONS` : 'sees none' };
});

// ══ 6. Read the ledger ════════════════════════════════════════════════════
await attack('cannot read the whole ledger', async () => {
  const { data } = await sb.from('wallet_ledger').select('user_id, unlocked_delta');
  const others = (data ?? []).filter((r) => r.user_id !== me);
  return { stopped: others.length === 0,
           detail: others.length ? `SAW ${others.length} OTHER LEDGER ROWS` : 'sees none' };
});

// ══ 7. Change the service charge ══════════════════════════════════════════
await attack('cannot change the service charge', async () => {
  await sb.from('app_settings').update({ value: 0 }).eq('key', 'service_charge_pct');
  const { data } = await sb.from('app_settings').select('value').eq('key', 'service_charge_pct')
    .maybeSingle();
  return { stopped: Number(data?.value) !== 0, detail: `service charge is ${data?.value}%` };
});

// ══ 8. Write the ledger directly ══════════════════════════════════════════
await attack('cannot call post_ledger', async () => {
  const { error } = await sb.rpc('post_ledger', {
    p_user: me, p_locked: 0, p_unlocked: 999999, p_reason: 'free money',
  });
  return { stopped: !!error, detail: error ? error.message.slice(0, 60) : 'IT WORKED' };
});

// ══ 9. Refund myself with no admin review ═════════════════════════════════
await attack('cannot call exit_membership', async () => {
  const { error } = await sb.rpc('exit_membership', {
    p_member: '00000000-0000-0000-0000-000000000000', p_reason: 'faulty', p_proof_url: 'x',
  });
  const blocked = !!error && /permission denied|not found in schema/i.test(error.message);
  return { stopped: blocked, detail: error ? error.message.slice(0, 60) : 'IT WORKED' };
});

// ══ 10. Credit a payment that never happened ══════════════════════════════
await attack('cannot call credit_paid_order', async () => {
  const { error } = await sb.rpc('credit_paid_order', {
    p_cf_order_id: 'made-up', p_cf_payment_id: 'made-up',
  });
  const blocked = !!error && /permission denied|not found in schema/i.test(error.message);
  return { stopped: blocked, detail: error ? error.message.slice(0, 60) : 'IT WORKED' };
});

// ══ 11. Give myself a seat without paying ═════════════════════════════════
await attack('cannot insert a free membership', async () => {
  const { data: g } = await sb.from('groups').select('id').limit(1).maybeSingle();
  if (!g) return { stopped: true, detail: 'no groups to try against' };
  const { error } = await sb.from('group_members').insert({
    group_id: g.id, buyer_id: me,
    expires_on: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    amount_paid: 0,
  });
  return { stopped: !!error, detail: error ? error.message.slice(0, 60) : 'GOT A FREE SEAT' };
});

// ══ 12. Adjust a balance through the admin RPC ════════════════════════════
await attack('cannot call adjust_balance', async () => {
  const { error } = await sb.rpc('adjust_balance', {
    p_user: me, p_locked: 0, p_unlocked: 999999, p_reason: 'nice try',
  });
  return { stopped: !!error, detail: error ? error.message.slice(0, 60) : 'IT WORKED' };
});

report();

function report() {
  const pass = results.filter((r) => r.ok).length;
  const wide = Math.max(...results.map((r) => r.step.length));

  console.log(`${pass === results.length ? 'PASS' : 'FAIL'}  —  ${pass} of ${results.length}\n`);
  for (const r of results) {
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.step.padEnd(wide)}   ${r.detail}`);
  }
  console.log(`\nRemove the probe account when you are done:`);
  console.log(`  delete from auth.users where email = '${EMAIL}';`);
  process.exitCode = pass === results.length ? 0 : 1;
}
