// ════════════════════════════════════════════════════════════════════════
//  request-password-reset — step 1 of Forgot Password
//
//  Client sign-off: email OTP via Brevo (free), not SMS — DLT registration
//  for SMS needed a ₹5,900 fee up front just to test. "Mail ID" has been a
//  required signup field the whole time (0037 also fixed profiles.email,
//  which had always held a synthetic address, not what someone actually
//  typed in), so this reaches every existing user with no extra step from
//  them first.
//
//  Called with no user session — nobody is signed in yet when they've
//  forgotten their password — so this runs entirely on the service-role
//  key, never the caller's own JWT.
//
//  Deploy:  supabase functions deploy request-password-reset --no-verify-jwt
//
//  Secrets:
//    BREVO_API_KEY   set via: supabase secrets set BREVO_API_KEY=...
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';

const OTP_VALID_MINUTES = 10;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
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
    if (mobile.length !== 10) {
      return Response.json({ error: 'Enter a valid 10-digit mobile number' }, { status: 400, headers: cors });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: profile } = await admin
      .from('profiles').select('id, name, email').eq('mobile', mobile).maybeSingle();

    if (!profile?.email) {
      return Response.json({ error: 'No account found with that number' }, { status: 404, headers: cors });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await sha256(otp);
    const expiresAt = new Date(Date.now() + OTP_VALID_MINUTES * 60_000).toISOString();

    const { error: otpErr } = await admin.from('password_reset_otps').upsert({
      mobile, otp_hash: otpHash, attempts: 0, expires_at: expiresAt,
    });
    if (otpErr) throw otpErr;

    const { data: fromRow } = await admin
      .from('app_settings').select('value').eq('key', 'support_email').maybeSingle();
    const fromEmail = (fromRow?.value as string) || 'shareottssupport@gmail.com';

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': Deno.env.get('BREVO_API_KEY')!,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'ShareOTTs', email: fromEmail },
        to: [{ email: profile.email, name: profile.name ?? 'there' }],
        subject: `${otp} is your ShareOTTs password reset code`,
        htmlContent:
          `<p>Hi ${profile.name ?? ''},</p>` +
          `<p>Your password reset code is:</p>` +
          `<p style="font-size:28px;font-weight:800;letter-spacing:4px">${otp}</p>` +
          `<p>This code expires in ${OTP_VALID_MINUTES} minutes. If you did not ask to reset your password, you can ignore this email.</p>`,
      }),
    });

    if (!brevoRes.ok) {
      console.error('Brevo send failed', await brevoRes.text());
      return Response.json({ error: 'Could not send the reset email right now' }, { status: 502, headers: cors });
    }

    return Response.json({ ok: true }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Could not process the request' }, { status: 500, headers: cors });
  }
});
