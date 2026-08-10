-- ════════════════════════════════════════════════════════════════════════
--  0016 — let a buyer rejoin a group they left
--
--  group_members carried `unique (group_id, buyer_id)` across every row,
--  including exited ones. purchase_screen() checks for an existing seat but
--  filters to status in ('active','expiring') — so the two disagreed:
--
--    buyer joins  → exits  → tries to join the same group again
--    purchase_screen's own check passes (the old seat is 'exited')
--    the INSERT then dies on the unique constraint
--
--  The buyer saw a raw duplicate-key error and could never rejoin that
--  seller's group. The status filter in purchase_screen is the evidence that
--  rejoining was meant to be allowed; the blanket constraint was the mistake.
--
--  Replaced with a partial unique index that enforces the rule actually
--  wanted: one LIVE seat per buyer per group, any number of closed ones.
--
--  Found by the money smoke test.
-- ════════════════════════════════════════════════════════════════════════

-- Look the constraint up rather than trusting the generated name.
do $$
declare v_name text;
begin
  select con.conname into v_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
   where nsp.nspname = 'public'
     and rel.relname = 'group_members'
     and con.contype = 'u'
     and con.conkey @> array[
           (select attnum from pg_attribute
             where attrelid = rel.oid and attname = 'group_id'),
           (select attnum from pg_attribute
             where attrelid = rel.oid and attname = 'buyer_id')
         ]::smallint[]
   limit 1;

  if v_name is not null then
    execute format('alter table group_members drop constraint %I', v_name);
  end if;
end $$;

-- One live seat per buyer per group. Exited and expired rows are ignored,
-- so the history stays intact and the buyer can come back.
create unique index if not exists group_members_one_live_seat
  on group_members (group_id, buyer_id)
  where status in ('active', 'expiring');

comment on index group_members_one_live_seat is
  'A buyer may hold only one active seat in a group, but may rejoin after exiting.';
