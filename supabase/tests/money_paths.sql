-- Exercise every money path in 0002. Any failed check raises and stops the run.
\set ON_ERROR_STOP 1

create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if ok then raise notice 'PASS  %', what; else raise exception 'FAIL  %', what; end if;
end $$;

create or replace function pg_temp.credit(c uuid) returns int language sql as $$ select credit_balance(c) $$;
create or replace function pg_temp.stock(p uuid) returns int language sql as $$ select stock_qty from products where id = p $$;

insert into products (id, name, slug, price, stock_qty) values
  ('00000000-0000-0000-0000-00000000f001', 'Fridge', 'fridge', 530000, 2),
  ('00000000-0000-0000-0000-00000000f002', 'Blender', 'blender', 45000, 5),
  ('00000000-0000-0000-0000-00000000f003', 'Phone', 'phone', 240000, 3);
insert into customers (id, full_name, phone) values
  ('00000000-0000-0000-0000-0000000000a1', 'Akosua Mensah', '+233240000001'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ama Owusu', '+233550000003');
insert into plans (id, ref, customer_id, product_id, price, duration_months) values
  ('00000000-0000-0000-0000-0000000000b1', 'EB-PLANFRIDGE', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000f001', 530000, 6),
  ('00000000-0000-0000-0000-0000000000b2', 'EB-PLANBLENDR', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000f002', 45000, 1),
  ('00000000-0000-0000-0000-0000000000b3', 'EB-PLANPHONE1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000f003', 240000, 6),
  ('00000000-0000-0000-0000-0000000000b4', 'EB-PLANEXPIRE', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000f003', 240000, 3),
  ('00000000-0000-0000-0000-0000000000b5', 'EB-PLANNOPAY1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000f002', 45000, 2);

do $$
declare r jsonb; a uuid := '00000000-0000-0000-0000-0000000000a1'; fridge uuid := '00000000-0000-0000-0000-00000000f001';
begin
  -- 1. First Paystack payment activates the plan and reserves one fridge.
  r := record_payment('PS-1', 'EB-PLANFRIDGE', 53000, 'mobile_money', '{}'::jsonb);
  perform pg_temp.check((r->>'inserted')::boolean and r->'plan'->>'status' = 'active', 'first payment activates plan');
  perform pg_temp.check(pg_temp.stock(fridge) = 1, 'first payment reserves stock (2 -> 1)');
  perform pg_temp.check(r->'plan'->>'due_date' is not null, 'end date set on activation');

  -- 2. Replayed webhook is a no-op.
  r := record_payment('PS-1', 'EB-PLANFRIDGE', 53000, 'mobile_money', '{}'::jsonb);
  perform pg_temp.check(not (r->>'inserted')::boolean, 'replayed Paystack reference ignored');
  perform pg_temp.check((select total_paid from plans where ref = 'EB-PLANFRIDGE') = 53000, 'total not double-counted');

  -- 3. Cash at the counter gets a receipt number and the staff email.
  r := record_payment('CASH-1', 'EB-PLANFRIDGE', 50000, 'cash', null, 'cash', 'abena@shop', 'paid by brother');
  perform pg_temp.check(r->>'receipt_no' = 'C-0001', 'cash gets receipt C-0001');
  perform pg_temp.check((select recorded_by from payments where receipt_no = 'C-0001') = 'abena@shop', 'cash stores staff email');
  perform pg_temp.check((select total_paid from plans where ref = 'EB-PLANFRIDGE') = 103000, 'cash adds to plan (103000)');
  perform pg_temp.check(pg_temp.stock(fridge) = 1, 'later payments do not reserve more stock');
  r := record_payment('CASH-2', 'EB-PLANBLENDR', 10000, 'cash', null, 'cash', 'kojo@shop', null);
  perform pg_temp.check(r->>'receipt_no' = 'C-0002', 'receipt numbers count up (C-0002)');

  -- 4. Paying more than the balance: plan completes, extra becomes credit.
  r := record_payment('PS-2', 'EB-PLANBLENDR', 40000, 'card', '{}'::jsonb);
  perform pg_temp.check(r->'plan'->>'status' = 'completed', 'overpayment completes the plan');
  perform pg_temp.check((r->>'credited')::int = 5000, 'extra 5000 reported as credited');
  perform pg_temp.check((select total_paid from plans where ref = 'EB-PLANBLENDR') = 45000, 'plan total capped at price');
  perform pg_temp.check(pg_temp.credit(a) = 5000, 'extra 5000 is in store credit');

  -- 5. Customer cancels: fridge back in stock, 100% paid -> credit.
  r := end_plan('00000000-0000-0000-0000-0000000000b1', 'cancelled_by_customer', null);
  perform pg_temp.check((r->>'ended')::boolean and r->'plan'->>'status' = 'cancelled', 'cancel ends the plan');
  perform pg_temp.check((r->'plan'->>'credited_amount')::int = 103000, 'credited_amount = everything paid');
  perform pg_temp.check(pg_temp.stock(fridge) = 2, 'cancel releases the fridge (1 -> 2)');
  perform pg_temp.check(pg_temp.credit(a) = 108000, 'credit now 5000 + 103000');

  -- 6. Ending twice does nothing.
  r := end_plan('00000000-0000-0000-0000-0000000000b1', 'cancelled_by_customer', null);
  perform pg_temp.check(not (r->>'ended')::boolean, 'second cancel is a no-op');
  perform pg_temp.check(pg_temp.credit(a) = 108000 and pg_temp.stock(fridge) = 2, 'no double credit or stock');

  -- 7. A Paystack payment that lands after the plan ended goes to credit.
  r := record_payment('PS-LATE', 'EB-PLANFRIDGE', 20000, 'mobile_money', '{}'::jsonb);
  perform pg_temp.check((r->>'credited')::int = 20000, 'late payment fully credited');
  perform pg_temp.check((select total_paid from plans where ref = 'EB-PLANFRIDGE') = 103000, 'ended plan total unchanged');
  perform pg_temp.check(pg_temp.credit(a) = 128000, 'credit now 128000');
  perform pg_temp.check(pg_temp.stock(fridge) = 2, 'late payment does not reserve stock');
end $$;

-- 8. Spending credit on a new plan.
do $$
declare r jsonb; a uuid := '00000000-0000-0000-0000-0000000000a1'; phone uuid := '00000000-0000-0000-0000-00000000f003';
begin
  r := spend_credit('EB-PLANPHONE1', 100000, null);
  perform pg_temp.check(r->'plan'->>'status' = 'active', 'credit as first payment activates plan');
  perform pg_temp.check(pg_temp.stock(phone) = 2, 'credit first payment reserves stock (3 -> 2)');
  perform pg_temp.check(pg_temp.credit(a) = 28000, 'credit reduced to 28000');
  perform pg_temp.check((select method from payments p join plans pl on pl.id = p.plan_id where pl.ref = 'EB-PLANPHONE1') = 'credit', 'payment recorded as method credit');
end $$;

do $$
begin
  perform spend_credit('EB-PLANPHONE1', 50000, null);
  raise exception 'FAIL  spending more credit than you have should be refused';
exception when others then
  perform pg_temp.check(sqlerrm = 'Not enough store credit', 'refuses spending more credit than you have');
end $$;

do $$
begin
  perform spend_credit('EB-PLANBLENDR', 1000, null);
  raise exception 'FAIL  credit on a completed plan should be refused';
exception when others then
  perform pg_temp.check(sqlerrm = 'This plan is not accepting payments', 'refuses credit on a closed plan');
end $$;

do $$
begin
  perform spend_credit('EB-PLANPHONE1', 999999, null);
  raise exception 'FAIL  credit above the balance should be refused';
exception when others then
  perform pg_temp.check(sqlerrm = 'That is more than the balance on this plan', 'refuses credit above the plan balance');
end $$;

do $$
begin
  perform pg_temp.check(credit_balance('00000000-0000-0000-0000-0000000000a1') = 28000, 'failed spends left credit untouched');
end $$;

-- 9. End date passes unpaid -> "ended unpaid", stock back, money to credit.
do $$
declare r jsonb; b uuid := '00000000-0000-0000-0000-0000000000a2'; phone uuid := '00000000-0000-0000-0000-00000000f003';
begin
  perform record_payment('PS-3', 'EB-PLANEXPIRE', 60000, 'mobile_money', '{}'::jsonb);
  perform pg_temp.check(pg_temp.stock(phone) = 1, 'second phone reserved (2 -> 1)');
  r := end_plan('00000000-0000-0000-0000-0000000000b4', 'expired', null);
  perform pg_temp.check(r->'plan'->>'status' = 'defaulted' and r->'plan'->>'ended_reason' = 'expired', 'expiry marks plan ended unpaid');
  perform pg_temp.check(pg_temp.stock(phone) = 2, 'expiry releases the phone (1 -> 2)');
  perform pg_temp.check(pg_temp.credit(b) = 60000, 'expiry moves 100% to credit');

  -- 10. Ending a plan with no first payment: nothing reserved, nothing credited.
  r := end_plan('00000000-0000-0000-0000-0000000000b5', 'no_deposit', null);
  perform pg_temp.check(r->'plan'->>'status' = 'cancelled', 'unpaid plan can be dropped');
  perform pg_temp.check(pg_temp.stock('00000000-0000-0000-0000-00000000f002') = 4, 'dropping unpaid plan does not touch stock (blender stays 4)');
  perform pg_temp.check(pg_temp.credit(b) = 60000, 'dropping unpaid plan adds no credit');
end $$;

-- 11. Ledger matches: credit given = paid on ended plans + overpayments - spent.
do $$
begin
  perform pg_temp.check(
    (select sum(amount) from credit_entries) = (select coalesce(sum(credited_amount),0) from plans) + 5000 + 20000 - 100000,
    'ledger total = ended plans + overpayments - spent');
end $$;

-- 12. The public API roles cannot touch the money functions.
set role anon;
do $$
begin
  perform record_payment('HACK', 'EB-PLANPHONE1', 1, 'x', null);
  raise exception 'FAIL  anon could call record_payment';
exception when insufficient_privilege then
  perform pg_temp.check(true, 'anon cannot call record_payment');
end $$;
do $$
begin
  perform spend_credit('EB-PLANPHONE1', 1, null);
  raise exception 'FAIL  anon could call spend_credit';
exception when insufficient_privilege then
  perform pg_temp.check(true, 'anon cannot call spend_credit');
end $$;
reset role;
set role authenticated;
do $$
begin
  perform end_plan('00000000-0000-0000-0000-0000000000b3', 'cancelled_by_staff', null);
  raise exception 'FAIL  authenticated could call end_plan';
exception when insufficient_privilege then
  perform pg_temp.check(true, 'logged-in users cannot call end_plan');
end $$;
reset role;

select 'ALL CHECKS PASSED' as result;
