// ════════════════════════════════════════════════════════════════════════
//  ring-seller — the chat "ring" bell
//
//  Client: "Put 🔔 Bell icon and Trail count, so that if any user want otp
//  and that seller was offline, user will ring so that customer will come
//  online. (refils 12 hours)." One ring per conversation, refilling every
//  12 hours.
//
//  Lives here, not as a plain RPC, because sending the actual push needs
//  the Firebase service account (via send-push) — same reasoning as
//  send-push itself: that key must never reach the app. The cooldown
//  check/write happens first, through the CALLER's own JWT, so RLS alone
//  (chat_threads' existing threads_update policy) guarantees only the
//  buyer on this exact thread can ring it — no new policy needed for that
//  part.
//
//  Deploy:  supabase functions deploy ring-seller
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
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

    const body = await req.json();
    const threadId = body.threadId as string;
    if (!threadId) {
      return Response.json({ error: 'Missing threadId' }, { status: 400, headers: cors });
    }

    // RLS (threads_read) already limits this to threads the caller is
    // actually part of — a stranger's threadId simply comes back empty.
    const { data: thread, error: threadErr } = await asUser
      .from('chat_threads')
      .select('id, buyer_id, seller_id, last_ring_at, groups(ott_apps(title))')
      .eq('id', threadId)
      .maybeSingle();

    if (threadErr || !thread) {
      return Response.json({ error: 'Conversation not found' }, { status: 404, headers: cors });
    }
    if (thread.buyer_id !== user.id) {
      return Response.json({ error: 'Only the buyer can ring this bell' }, { status: 403, headers: cors });
    }

    const lastRing = thread.last_ring_at ? new Date(thread.last_ring_at).getTime() : 0;
    const elapsed = Date.now() - lastRing;
    if (elapsed < TWELVE_HOURS_MS) {
      return Response.json({
        ok: false,
        retryAfterMs: TWELVE_HOURS_MS - elapsed,
      }, { headers: cors });
    }

    // Buyer updating their own thread — allowed by threads_update (0002),
    // no service-role needed for this part.
    const { error: updateErr } = await asUser
      .from('chat_threads')
      .update({ last_ring_at: new Date().toISOString() })
      .eq('id', threadId);
    if (updateErr) throw updateErr;

    // Service-role only for what actually needs it: reading the buyer's
    // name (not selectable cross-user under 0032's column lockdown, and
    // not needed there anyway) and sending the push itself.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: buyerProfile } = await admin
      .from('profiles').select('name').eq('id', user.id).maybeSingle();

    const ottTitle = (thread as any).groups?.ott_apps?.title ?? 'their group';

    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: thread.seller_id,
        ruleKey: 'buyer_ring',
        vars: { buyer: buyerProfile?.name ?? 'A buyer', ott: ottTitle },
        route: `/user/chat?thread=${threadId}`,
      }),
    }).catch((e) => console.error('send-push call failed', e));

    return Response.json({ ok: true }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Could not ring right now' }, { status: 500, headers: cors });
  }
});
