-- ════════════════════════════════════════════════════════════════════════
--  0011 — faulty-account exit review, and referral codes
--
--  The freeze doc says a faulty-account claim needs photo proof and a 100%
--  refund plus a seller penalty. That cannot be self-serve: the buyer would
--  simply always pick "faulty" and take the seller's money. So a faulty exit
--  now raises a request for admin to review; a personal exit still applies
--  straight away because the buyer is the one losing out there.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists exit_requests (
  id              uuid primary key default gen_random_uuid(),
  group_member_id uuid not null references group_members(id) on delete cascade,
  buyer_id        uuid not null references profiles(id) on delete cascade,
  reason          exit_reason not null,
  note            text,
  proof_url       text,
  status          tx_status not null default 'pending',
  reject_reason   text,
  decided_by      uuid references profiles(id),
  decided_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists exit_requests_pending
  on exit_requests (status, created_at desc);
create index if not exists exit_requests_member
  on exit_requests (group_member_id);

alter table exit_requests enable row level security;

create policy exit_req_own on exit_requests for select to authenticated
  using (
    buyer_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from group_members m
      join groups g on g.id = m.group_id
      where m.id = group_member_id and g.seller_id = auth.uid()
    )
  );

create policy exit_req_admin on exit_requests for all to authenticated
  using (is_admin()) with check (is_admin());

/**
 * Raised by the buyer. A personal exit is applied immediately; a faulty
 * claim is queued because it takes money off the seller and penalises them.
 */
create or replace function request_exit(
  p_member uuid,
  p_reason exit_reason,
  p_note text default null,
  p_proof_url text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare m group_members%rowtype;
begin
  select * into m from group_members where id = p_member for update;
  if not found then raise exception 'Membership not found'; end if;
  if m.buyer_id <> auth.uid() then raise exception 'Not your membership'; end if;
  if m.status not in ('active', 'expiring') then
    raise exception 'This membership is already %', m.status;
  end if;

  if exists (
    select 1 from exit_requests
     where group_member_id = p_member and status = 'pending'
  ) then
    raise exception 'You already have an exit request being reviewed';
  end if;

  if p_reason = 'personal' then
    -- Buyer accepts losing half; nothing to verify.
    perform exit_membership(p_member, 'personal', null);
    insert into exit_requests
      (group_member_id, buyer_id, reason, note, status, decided_at)
    values (p_member, auth.uid(), 'personal', p_note, 'cleared', now());
    return 'applied';
  end if;

  if p_proof_url is null then
    raise exception 'A photo of the problem is required for a faulty-account claim';
  end if;

  insert into exit_requests (group_member_id, buyer_id, reason, note, proof_url)
  values (p_member, auth.uid(), 'faulty', p_note, p_proof_url);

  return 'pending';
end $$;

create or replace function approve_exit_request(p_request uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare r exit_requests%rowtype;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  select * into r from exit_requests where id = p_request for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'Already %', r.status; end if;

  -- Does the refund and the seller penalty in one transaction.
  perform exit_membership(r.group_member_id, r.reason, r.proof_url);

  update exit_requests
     set status = 'cleared', decided_by = auth.uid(), decided_at = now()
   where id = p_request;
end $$;

create or replace function reject_exit_request(p_request uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update exit_requests
     set status = 'rejected', reject_reason = p_reason,
         decided_by = auth.uid(), decided_at = now()
   where id = p_request and status = 'pending';
  if not found then raise exception 'Request not found or already decided'; end if;
end $$;

grant execute on function request_exit(uuid, exit_reason, text, text) to authenticated;
grant execute on function approve_exit_request(uuid) to authenticated;
grant execute on function reject_exit_request(uuid, text) to authenticated;

-- exit_membership() is now only reachable through the functions above, so a
-- buyer cannot call it directly and hand themselves a faulty-account refund.
revoke execute on function exit_membership(uuid, exit_reason, text) from authenticated;

-- ── Referral codes ──────────────────────────────────────────────────────
/**
 * Each user gets one short code, generated on first request and reused after.
 * Collisions are possible with 6 characters, so we retry rather than trust
 * a single roll of the dice.
 */
create or replace function my_referral_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_try  integer := 0;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select code into v_code from referrals
   where referrer_id = auth.uid() and referred_id is null
   limit 1;
  if v_code is not null then return v_code; end if;

  loop
    v_try := v_try + 1;
    -- No 0/O/1/I: these get misread when someone types a code by hand.
    v_code := upper(
      substr(translate(encode(gen_random_bytes(8), 'base64'),
                       '0O1Il+/=', 'ABCDEFGH'), 1, 6)
    );

    begin
      insert into referrals (referrer_id, code) values (auth.uid(), v_code);
      return v_code;
    exception when unique_violation then
      if v_try > 8 then raise exception 'Could not generate a code, try again'; end if;
    end;
  end loop;
end $$;

/** Called once by a new user. Credits the referrer per app_settings. */
create or replace function redeem_referral(p_code text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r        referrals%rowtype;
  v_reward numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if coalesce((select value #>> '{}' from app_settings where key = 'referral_enabled'), 'true') <> 'true' then
    raise exception 'Referrals are not active right now';
  end if;

  select * into r from referrals where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'That code is not valid'; end if;
  if r.referrer_id = auth.uid() then raise exception 'You cannot use your own code'; end if;
  if r.referred_id is not null then raise exception 'That code has already been used'; end if;

  if exists (select 1 from referrals where referred_id = auth.uid()) then
    raise exception 'You have already used a referral code';
  end if;

  v_reward := coalesce((select (value #>> '{}')::numeric from app_settings
                         where key = 'referral_reward'), 0);

  update referrals
     set referred_id = auth.uid(), reward_amount = v_reward
   where id = r.id;
end $$;

grant execute on function my_referral_code() to authenticated;
grant execute on function redeem_referral(text) to authenticated;
