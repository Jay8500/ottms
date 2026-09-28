// ════════════════════════════════════════════════════════════════════════
//  confirm-password-reset — step 2 of Forgot Password
//
//  Verifies the code from request-password-reset and sets the new
//  password. Actually changing someone's password needs the Admin API
//  (auth.admin.updateUserById), which only works with the service-role
//  key — there is no safe way to do this from a plain client-callable RPC,
//  same reasoning as every other service-role-only Edge Function here.
//
//  Deploy:  supabase functions deploy confirm-password-reset --no-verify-jwt
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_ATTEMPTS = 5;

// See request-password-reset for why: supabase-js always sends an `apikey`
// header, and a WebView's CORS preflight blocks the whole request if it
// isn't explicitly allowed here.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();
    const mobile = String(body.mobile ?? '').replace(/\D/g, '');
    const otp = String(body.otp ?? '').trim();
    const newPassword = String(body.newPassword ?? '');

    if (mobile.length !== 10 || !/^\d{6}$/.test(otp)) {
      return Response.json({ error: 'Invalid request' }, { status: 400, headers: cors });
    }
    if (newPassword.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400, headers: cors });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: row } = await admin
      .from('password_reset_otps').select('*').eq('mobile', mobile).maybeSingle();

    if (!row) {
      return Response.json({ error: 'Request a new code first' }, { status: 400, headers: cors });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await admin.from('password_reset_otps').delete().eq('mobile', mobile);
      return Response.json({ error: 'This code has expired — request a new one' }, { status: 400, headers: cors });
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await admin.from('password_reset_otps').delete().eq('mobile', mobile);
      return Response.json({ error: 'Too many wrong attempts — request a new code' }, { status: 429, headers: cors });
    }

    const hash = await sha256(otp);
    if (hash !== row.otp_hash) {
      await admin.from('password_reset_otps')
        .update({ attempts: row.attempts + 1 }).eq('mobile', mobile);
      return Response.json({ error: 'Incorrect code' }, { status: 400, headers: cors });
    }

    const { data: profile } = await admin
      .from('profiles').select('id').eq('mobile', mobile).maybeSingle();
    if (!profile) {
      return Response.json({ error: 'Account not found' }, { status: 404, headers: cors });
    }

    const { error: pwErr } = await admin.auth.admin.updateUserById(profile.id, { password: newPassword });
    if (pwErr) throw pwErr;

    await admin.from('password_reset_otps').delete().eq('mobile', mobile);

    return Response.json({ ok: true }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Could not reset the password right now' }, { status: 500, headers: cors });
  }
});
