// ════════════════════════════════════════════════════════════════════════
//  cashfree-create-order
//
//  Creates a Cashfree order and returns a payment session the app can open.
//
//  The Secret Key lives only here. It must never reach the app: anyone
//  holding it can create orders and issue refunds against the account.
//
//  Deploy:  supabase functions deploy cashfree-create-order
//
//  Secrets:
//    CASHFREE_APP_ID       public-ish; also stored in app_settings
//    CASHFREE_SECRET_KEY   NEVER in the app
//    CASHFREE_MODE         "sandbox" | "production"
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';

const API_VERSION = '2023-08-01';

function baseUrl(mode: string) {
  return mode === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // ── Who is asking? Trust the JWT, not the body. ────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return Response.json({ error: 'Not signed in' }, { status: 401, headers: cors });
    }

    const asUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: auth } = await asUser.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return Response.json({ error: 'Not signed in' }, { status: 401, headers: cors });
    }

    // ── Validate the amount ────────────────────────────────────────────
    const body = await req.json();
    const walletAmount = Number(body.amount);

    if (!Number.isFinite(walletAmount) || walletAmount <= 0) {
      return Response.json({ error: 'Enter a valid amount' }, { status: 400, headers: cors });
    }
    if (walletAmount < 10) {
      return Response.json({ error: 'Minimum top-up is ₹10' }, { status: 400, headers: cors });
    }
    if (walletAmount > 100000) {
      return Response.json({ error: 'Maximum top-up is ₹1,00,000' }, { status: 400, headers: cors });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fee comes from settings, not from the client (Q1).
    const { data: feeRow } = await admin
      .from('app_settings').select('value')
      .eq('key', 'addfund_gateway_fee_pct').maybeSingle();

    const feePct = Number(feeRow?.value ?? 0);
    const gatewayFee = Math.round(walletAmount * feePct) / 100;
    const chargeAmount = Math.round((walletAmount + gatewayFee) * 100) / 100;

    // ── Profile details Cashfree wants ─────────────────────────────────
    const { data: profile } = await admin
      .from('profiles').select('name, mobile, email').eq('id', user.id).maybeSingle();

    const cfOrderId = `ORD_${user.id.slice(0, 8)}_${Date.now()}`;

    // Record the order BEFORE calling the gateway, so the webhook always
    // has something to match against even if the response is lost.
    const { error: insErr } = await admin.from('payment_orders').insert({
      user_id: user.id,
      wallet_amount: walletAmount,
      gateway_fee: gatewayFee,
      charge_amount: chargeAmount,
      cf_order_id: cfOrderId,
    });
    if (insErr) throw insErr;

    // ── Create the order with Cashfree ─────────────────────────────────
    const mode = Deno.env.get('CASHFREE_MODE') ?? 'sandbox';

    const res = await fetch(`${baseUrl(mode)}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': API_VERSION,
        'x-client-id': Deno.env.get('CASHFREE_APP_ID')!,
        'x-client-secret': Deno.env.get('CASHFREE_SECRET_KEY')!,
      },
      body: JSON.stringify({
        order_id: cfOrderId,
        order_amount: chargeAmount,
        order_currency: 'INR',
        customer_details: {
          customer_id: user.id,
          customer_name: profile?.name ?? 'User',
          customer_phone: profile?.mobile ?? '9999999999',
          customer_email: profile?.email || 'support@shareotts.app',
        },
        order_meta: {
          notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/cashfree-webhook`,
        },
        order_note: `Wallet top-up ₹${walletAmount}`,
      }),
    });

    const out = await res.json();

    if (!res.ok || !out.payment_session_id) {
      console.error('Cashfree order failed', out);
      await admin.rpc('fail_order', {
        p_cf_order_id: cfOrderId,
        p_reason: out.message ?? 'Gateway rejected the order',
      });
      return Response.json(
        { error: out.message ?? 'Could not start the payment' },
        { status: 502, headers: cors },
      );
    }

    return Response.json({
      orderId: cfOrderId,
      paymentSessionId: out.payment_session_id,
      walletAmount,
      gatewayFee,
      chargeAmount,
      mode,
    }, { headers: cors });

  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Could not start the payment' }, { status: 500, headers: cors });
  }
});
