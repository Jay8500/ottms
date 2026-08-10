-- ════════════════════════════════════════════════════════════════════════
--  0013 — Cashfree payment orders
--
--  The order is created server-side and the amount is recorded HERE, before
--  the user is sent to the gateway. When the webhook comes back we credit
--  what this table says, never what the callback claims — otherwise anyone
--  could POST "I paid ₹100000" and be believed.
--
--  Q1: the gateway fee is added on top and collected by Cashfree. The
--  platform earns nothing on a top-up, so wallet credit = the amount the
--  user asked for, not the amount they were charged.
-- ════════════════════════════════════════════════════════════════════════

create type payment_order_status as enum ('created', 'paid', 'failed', 'expired');

create table payment_orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,

  -- what lands in the wallet
  wallet_amount  numeric(12,2) not null check (wallet_amount > 0),
  -- gateway fee added on top (Cashfree keeps this)
  gateway_fee    numeric(12,2) not null default 0 check (gateway_fee >= 0),
  -- what the user is actually charged
  charge_amount  numeric(12,2) not null check (charge_amount > 0),

  cf_order_id    text not null unique,
  cf_payment_id  text,
  status         payment_order_status not null default 'created',
  failure_reason text,

  -- set once the wallet has actually been credited, so a retried webhook
  -- cannot pay someone twice
  credited_at    timestamptz,
  transaction_id uuid references wallet_transactions(id) on delete set null,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on payment_orders (user_id, created_at desc);
create index on payment_orders (status, created_at desc);

alter table payment_orders enable row level security;

-- Users can watch their own order; nobody writes from the client. Rows are
-- created and updated only by the Edge Functions using the service role,
-- which bypasses RLS.
create policy orders_own on payment_orders for select to authenticated
  using (user_id = auth.uid() or is_admin());

/**
 * Credits a wallet after Cashfree confirms payment.
 *
 * Idempotent: a second call for the same order returns without doing
 * anything. Cashfree retries webhooks on any non-2xx, and a duplicate here
 * would be free money.
 */
create or replace function credit_paid_order(
  p_cf_order_id text,
  p_cf_payment_id text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  o   payment_orders%rowtype;
  v_tx uuid;
begin
  select * into o from payment_orders
   where cf_order_id = p_cf_order_id for update;

  if not found then
    raise exception 'Unknown order %', p_cf_order_id;
  end if;

  if o.credited_at is not null then
    return;   -- already handled, this is a retry
  end if;

  insert into wallet_transactions
    (user_id, tx_type, tx_kind, status, amount, payment_app, txn_ref, decided_at)
  values
    (o.user_id, 'funded', 'addfund', 'cleared', o.wallet_amount,
     'Cashfree', p_cf_payment_id, now())
  returning id into v_tx;

  perform post_ledger(o.user_id, 0, o.wallet_amount, 'Added via Cashfree', v_tx);

  update payment_orders
     set status = 'paid',
         cf_payment_id = p_cf_payment_id,
         credited_at = now(),
         transaction_id = v_tx,
         updated_at = now()
   where id = o.id;
end $$;

create or replace function fail_order(p_cf_order_id text, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update payment_orders
     set status = 'failed', failure_reason = p_reason, updated_at = now()
   where cf_order_id = p_cf_order_id and credited_at is null;
end $$;

-- Only the service role calls these; never the app.
revoke execute on function credit_paid_order(text, text) from public, authenticated;
revoke execute on function fail_order(text, text) from public, authenticated;
