-- ════════════════════════════════════════════════════════════════════════
--  0023 — a preferred payment app on bank/UPI details
--
--  Client asked (round 4): "Add UPI Number, Put option of Selectable
--  Payment App - So we Admins will pay their amount back with mentioned
--  details." UPI ID already existed; this adds which app the payout should
--  be sent through (PhonePe / GPay / Paytm / Bank), shown to admin when
--  processing a withdrawal.
--
--  Added to both bank_details and bank_change_requests, and carried
--  through by approve_bank_change() same as every other column.
-- ════════════════════════════════════════════════════════════════════════

alter table bank_details         add column if not exists payment_app text;
alter table bank_change_requests add column if not exists payment_app text;

create or replace function approve_bank_change(p_request uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare r bank_change_requests%rowtype;
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  select * into r from bank_change_requests where id = p_request for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'Already %', r.status; end if;

  insert into bank_details (user_id, holder_name, upi_id, account_no, ifsc, payment_app, locked)
  values (r.user_id, r.holder_name, r.upi_id, r.account_no, r.ifsc, r.payment_app, true)
  on conflict (user_id) do update
     set holder_name = excluded.holder_name,
         upi_id      = excluded.upi_id,
         account_no  = excluded.account_no,
         ifsc        = excluded.ifsc,
         payment_app = excluded.payment_app;

  update bank_change_requests
     set status = 'cleared', decided_by = auth.uid(), decided_at = now()
   where id = p_request;
end $$;
