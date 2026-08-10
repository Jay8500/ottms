// ════════════════════════════════════════════════════════════════════════
//  send-push — delivers a notification via Firebase Cloud Messaging
//
//  Lives here rather than in the app because it needs the Firebase service
//  account key, which grants server-level access to the project. That key
//  must never ship inside an APK.
//
//  Deploy:
//    supabase functions deploy send-push
//
//  Secrets (Project Settings → Edge Functions → Secrets):
//    FIREBASE_PROJECT_ID     ottmoneysaver-19e75
//    FIREBASE_CLIENT_EMAIL   from the service account JSON
//    FIREBASE_PRIVATE_KEY    from the service account JSON, newlines kept
//
//  Call it from Postgres (or any server context) with a service_role key:
//    {
//      "userIds": ["uuid", ...],       // or "userId": "uuid"
//      "ruleKey": "payment_approved",  // looked up in notification_rules
//      "vars":    { "amount": "500" }, // fills {amount} in the template
//      "route":   "/user/wallet"       // where a tap should land
//    }
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

interface Payload {
  userId?: string;
  userIds?: string[];
  ruleKey: string;
  vars?: Record<string, string>;
  route?: string;
}

/** Signs a JWT with the service account key and swaps it for an access token. */
async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')!;
  const rawKey = Deno.env.get('FIREBASE_PRIVATE_KEY')!;

  // Secrets managers commonly store the newlines escaped.
  const pem = rawKey.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: clientEmail,
    scope: FCM_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsigned = `${b64(header)}.${b64(claim)}`;

  const der = Uint8Array.from(
    atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '')),
    c => c.charCodeAt(0),
  );

  const key = await crypto.subtle.importKey(
    'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned),
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${sigB64}`,
    }),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

/** Replaces {name} placeholders in a template. */
function fill(template: string, vars: Record<string, string> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body: Payload = await req.json();
    const targets = body.userIds ?? (body.userId ? [body.userId] : []);
    if (!targets.length) {
      return Response.json({ error: 'No recipients' }, { status: 400 });
    }

    // service_role: this runs server-side and must read other users' tokens.
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Admin can switch any notification off — respect that before sending.
    const { data: rule } = await db
      .from('notification_rules')
      .select('title, body_template, enabled')
      .eq('key', body.ruleKey)
      .maybeSingle();

    if (!rule) return Response.json({ error: 'Unknown rule' }, { status: 400 });
    if (!rule.enabled) return Response.json({ skipped: 'rule disabled' });

    const { data: tokens } = await db
      .from('device_tokens')
      .select('token')
      .in('user_id', targets);

    if (!tokens?.length) return Response.json({ sent: 0, reason: 'no devices' });

    const accessToken = await getAccessToken();
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID')!;
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const title = fill(rule.title, body.vars);
    const text = fill(rule.body_template, body.vars);

    let sent = 0;
    const stale: string[] = [];

    for (const { token } of tokens) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body: text },
            data: body.route ? { route: body.route } : {},
            android: { priority: 'high', notification: { channel_id: 'default' } },
          },
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        const err = await res.text();
        // Uninstalled apps leave dead tokens behind; clear them so the table
        // does not fill with addresses that can never be delivered to.
        if (/UNREGISTERED|INVALID_ARGUMENT/.test(err)) stale.push(token);
        else console.error('FCM send failed', err);
      }
    }

    if (stale.length) {
      await db.from('device_tokens').delete().in('token', stale);
    }

    return Response.json({ sent, removed: stale.length });
  } catch (e) {
    console.error(e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
