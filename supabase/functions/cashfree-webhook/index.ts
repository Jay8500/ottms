// ════════════════════════════════════════════════════════════════════════
//  cashfree-webhook
//
//  Cashfree calls this when a payment succeeds or fails.
//
//  ⚠ THIS ENDPOINT IS PUBLIC. Anyone on the internet can POST to it.
//  The signature check below is the only thing standing between us and
//  someone crediting themselves unlimited money by faking a success
//  callback. Do not weaken or skip it.
//
//  Deploy WITHOUT jwt verification — Cashfree cannot send a Supabase token:
//    supabase functions deploy cashfree-webhook --no-verify-jwt
//
//  Then register the URL in the Cashfree dashboard under Webhooks:
//    https://<project>.supabase.co/functions/v1/cashfree-webhook
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Cashfree signs (timestamp + raw body) with the secret key, HMAC-SHA256,
 * base64. Recomputing it proves the call really came from them and that the
 * body was not altered on the way.
 */
async function isSignatureValid(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const mac = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(timestamp + rawBody),
  );

  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // Constant-time compare. A plain === leaks how much of the signature was
  // correct through timing, which is enough to forge one given patience.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') ?? '';
    const timestamp = req.headers.get('x-webhook-timestamp') ?? '';
    const secret = Deno.env.get('CASHFREE_SECRET_KEY')!;

    if (!signature || !timestamp) {
      console.warn('Webhook missing signature headers');
      return new Response('Unauthorized', { status: 401 });
    }

    if (!(await isSignatureValid(rawBody, timestamp, signature, secret))) {
      console.warn('Webhook signature mismatch — ignoring');
      return new Response('Unauthorized', { status: 401 });
    }

    // Replay guard: a captured valid callback should not work forever.
    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
      console.warn('Webhook timestamp outside the 5 minute window');
      return new Response('Stale', { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const type: string = event.type ?? '';
    const order = event.data?.order;
    const payment = event.data?.payment;
    const cfOrderId: string | undefined = order?.order_id;

    if (!cfOrderId) return new Response('No order id', { status: 400 });

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      // credit_paid_order credits what OUR table says, not what this
      // payload claims, and is idempotent against Cashfree's retries.
      const { error } = await db.rpc('credit_paid_order', {
        p_cf_order_id: cfOrderId,
        p_cf_payment_id: String(payment?.cf_payment_id ?? ''),
      });
      if (error) {
        console.error('Credit failed', error);
        // Non-2xx makes Cashfree retry, which is what we want here.
        return new Response('Credit failed', { status: 500 });
      }
      return new Response('ok');
    }

    if (type === 'PAYMENT_FAILED_WEBHOOK' || type === 'PAYMENT_USER_DROPPED_WEBHOOK') {
      await db.rpc('fail_order', {
        p_cf_order_id: cfOrderId,
        p_reason: payment?.payment_message ?? 'Payment not completed',
      });
      return new Response('ok');
    }

    // Anything else (refunds, disputes) is acknowledged so Cashfree stops
    // retrying, but deliberately not acted on yet.
    console.log('Unhandled webhook type', type);
    return new Response('ok');

  } catch (e) {
    console.error(e);
    return new Response('Error', { status: 500 });
  }
});
