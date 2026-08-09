/**
 * Turns Supabase / Postgres errors into something a person can act on.
 *
 * Raw errors leak internals ("new row violates row-level security policy for
 * table \"groups\"") and sometimes secrets — our auth uses a synthetic email,
 * and the default message would show it. Every catch block in the app should
 * pass through here rather than printing `e.message`.
 */

interface Rule { test: RegExp; message: string; }

const RULES: Rule[] = [
  // ── Connectivity ──────────────────────────────────────────────────────
  { test: /failed to fetch|networkerror|network request failed/i,
    message: 'No internet connection. Check your network and try again.' },
  { test: /timeout|timed out/i,
    message: 'That took too long. Please try again.' },

  // ── Auth ──────────────────────────────────────────────────────────────
  { test: /invalid login credentials/i,
    message: 'Wrong mobile number or password.' },
  { test: /email not confirmed/i,
    message: 'This account is not verified yet. Contact support.' },
  { test: /user already registered|already been registered/i,
    message: 'That mobile number already has an account. Try signing in.' },
  { test: /password should be at least/i,
    message: 'Choose a password of at least 6 characters.' },
  { test: /jwt expired|invalid claim|not authenticated|jwt/i,
    message: 'Your session expired. Please sign in again.' },
  { test: /rate limit|too many requests/i,
    message: 'Too many attempts. Wait a minute and try again.' },

  // ── Our own RPC exceptions ────────────────────────────────────────────
  { test: /INSUFFICIENT_FUNDS/,
    message: 'Not enough balance. Add funds first.' },
  { test: /Admins only/i,
    message: 'You do not have permission to do that.' },
  { test: /group is full|This group is full/i,
    message: 'That group just filled up. Pick another seller.' },
  { test: /already in this group/i,
    message: 'You have already joined this group.' },
  { test: /cannot join your own/i,
    message: 'You cannot buy a seat in your own group.' },
  { test: /not open for joining/i,
    message: 'That listing is no longer available.' },
  { test: /Minimum withdrawal/i,
    message: 'That is below the minimum withdrawal amount.' },
  { test: /bank or UPI details/i,
    message: 'Add your bank or UPI details before withdrawing.' },
  { test: /Bank details are set once/i,
    message: 'Bank details cannot be changed here. Contact support.' },
  { test: /reason is required/i,
    message: 'Please give a reason.' },

  // ── Database constraints ──────────────────────────────────────────────
  { test: /one_active_group_per_seller_per_app/i,
    message: 'You already have an active group on this platform.' },
  { test: /duplicate key|already exists|unique constraint/i,
    message: 'That already exists.' },
  { test: /row-level security|violates row-level security/i,
    message: 'You do not have permission to do that.' },
  { test: /foreign key|violates foreign key/i,
    message: 'That item is still in use and cannot be removed.' },
  { test: /check constraint|violates check/i,
    message: 'Those values are not valid. Please review and try again.' },
  { test: /numeric field overflow|out of range/i,
    message: 'That amount is too large.' },

  // ── Storage ───────────────────────────────────────────────────────────
  { test: /payload too large|exceeded the maximum/i,
    message: 'That file is too big. Keep it under 5MB.' },
  { test: /bucket not found/i,
    message: 'Uploads are not set up yet. Contact support.' },
];

/** Never let these fragments reach a user. */
const LEAKY = /@moneysaver\.app|supabase\.co|relation "|column "|pg_|auth\.uid/i;

export function humanError(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = String(
    (e as any)?.message ?? (e as any)?.error_description ?? (e as any)?.error ?? e ?? '',
  );

  for (const rule of RULES) {
    if (rule.test.test(raw)) return rule.message;
  }

  // An unmapped error is fine to show only if it reveals nothing internal and
  // reads like a sentence — our RPCs raise deliberately worded exceptions.
  if (raw && raw.length < 140 && !LEAKY.test(raw)) return raw;

  return fallback;
}