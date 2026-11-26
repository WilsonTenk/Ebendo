-- Ebendo 0002: cash payments at the shop, store credit, SMS codes.
--
-- Client rules (2026-11-26):
--   * The item is collected only when the plan is fully paid.
--   * Staff can take cash at the counter; it counts like any payment.
--   * No cash refunds. If a customer cancels, or the plan's end date passes
--     before it is fully paid, the item goes straight back into stock and
--     100% of what they paid becomes store credit for any other item.
--
-- All money is in pesewas. Every money move happens inside one function call
-- so it is all-or-nothing.

-- ------------------------------------------------------------- payments
alter table payments
  add column method      text not null default 'paystack'
                         check (method in ('paystack', 'cash', 'credit')),
  add column recorded_by text,          -- staff email for cash / staff-applied credit
  add column note        text,
  add column receipt_no  text unique;   -- C-0001 ... for cash
comment on column payments.paystack_reference is
  'Idempotency key: the Paystack reference, or a CASH-/CREDIT- reference for shop entries';

create sequence cash_receipt_seq;

-- ---------------------------------------------------------------- plans
-- Statuses used for endings:
--   cancelled  = no first payment in 48h, or cancelled by customer/staff
--   defaulted  = end date passed before it was fully paid ("ended unpaid")
alter table plans
  add column ended_at        timestamptz,
  add column ended_reason    text check (ended_reason in
                               ('no_deposit', 'cancelled_by_customer', 'cancelled_by_staff', 'expired')),
  add column credited_amount integer not null default 0 check (credited_amount >= 0);

-- --------------------------------------------------------- store credit
-- A ledger, never a single editable number: balance = sum(amount).
create table credit_entries (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id),
  amount      integer not null check (amount <> 0),   -- + added, - spent
  kind        text not null check (kind in ('plan_ended', 'overpayment', 'spent', 'adjustment')),
  plan_id     uuid references plans (id),
  note        text,
  created_by  text,                                   -- staff email, or null for the customer/system
  created_at  timestamptz not null default now()
);
create index credit_entries_customer_idx on credit_entries (customer_id, created_at desc);

create or replace function credit_balance(p_customer_id uuid) returns integer
language sql stable as $$
  select coalesce(sum(amount), 0)::integer from credit_entries where customer_id = p_customer_id
$$;

-- ---------------------------------------------------------- phone codes
-- One-time SMS codes that prove a customer owns a phone number before they
-- cancel a plan or spend store credit. Only a hash of the code is stored.
create table phone_codes (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   integer not null default 0,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index phone_codes_phone_idx on phone_codes (phone, created_at desc);

-- ------------------------------------------------ record_payment (v2)
-- Same as before (atomic, idempotent on the reference) plus:
--   * method / recorded_by / note, and a receipt number for cash;
--   * money for a plan that has already ended, or more than the balance,
--     goes to the customer's store credit instead of being lost.
drop function if exists record_payment(text, text, integer, text, jsonb);

create function record_payment(
  p_reference   text,
  p_plan_ref    text,
  p_amount      integer,
  p_channel     text,
  p_raw         jsonb,
  p_method      text default 'paystack',
  p_recorded_by text default null,
  p_note        text default null
) returns jsonb
language plpgsql
as $$
declare
  v_plan        plans;
  v_inserted    boolean;
  v_was_pending boolean;
  v_open        boolean;
  v_to_plan     integer;
  v_extra       integer;
  v_receipt     text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be more than zero';
  end if;

  select * into v_plan from plans where ref = p_plan_ref for update;
  if not found then
    raise exception 'plan % not found', p_plan_ref;
  end if;
  v_was_pending := v_plan.status = 'pending_deposit';
  v_open        := v_plan.status in ('pending_deposit', 'active');

  if p_method = 'cash' then
    v_receipt := 'C-' || lpad(nextval('cash_receipt_seq')::text, 4, '0');
  end if;

  insert into payments (plan_id, paystack_reference, amount, channel, raw, method, recorded_by, note, receipt_no)
  values (v_plan.id, p_reference, p_amount, p_channel, p_raw, p_method, p_recorded_by, p_note, v_receipt)
  on conflict (paystack_reference) do nothing;
  get diagnostics v_inserted = row_count;

  if not v_inserted then
    return jsonb_build_object('inserted', false, 'plan', to_jsonb(v_plan), 'credited', 0);
  end if;

  v_to_plan := case when v_open then least(p_amount, v_plan.price - v_plan.total_paid) else 0 end;
  v_extra   := p_amount - v_to_plan;

  if v_extra > 0 then
    insert into credit_entries (customer_id, amount, kind, plan_id, note, created_by)
    values (v_plan.customer_id, v_extra, 'overpayment', v_plan.id,
            case when v_open then 'Paid more than the balance of ' || v_plan.ref
                 else 'Payment arrived after plan ' || v_plan.ref || ' ended' end,
            p_recorded_by);
  end if;

  if v_to_plan > 0 then
    update plans set
      total_paid   = total_paid + v_to_plan,
      status = case
        when total_paid + v_to_plan >= price then 'completed'::plan_status
        when status = 'pending_deposit' then 'active'::plan_status
        else status
      end,
      activated_at = coalesce(activated_at, now()),
      due_date     = coalesce(due_date, (now() + make_interval(months => duration_months))::date),
      completed_at = case when total_paid + v_to_plan >= price then coalesce(completed_at, now()) else completed_at end
    where id = v_plan.id
    returning * into v_plan;

    -- Reserve the item the first time the plan gets money.
    if v_was_pending then
      update products set stock_qty = greatest(stock_qty - 1, 0), updated_at = now()
      where id = v_plan.product_id;
    end if;
  end if;

  return jsonb_build_object('inserted', true, 'plan', to_jsonb(v_plan), 'credited', v_extra, 'receipt_no', v_receipt);
end;
$$;

-- ------------------------------------------------------------- end_plan
-- Ends an open plan: releases the reserved item back into stock and moves
-- 100% of what was paid into store credit. No cash refunds.
-- p_reason: no_deposit | cancelled_by_customer | cancelled_by_staff | expired
create function end_plan(p_plan_id uuid, p_reason text, p_by text default null) returns jsonb
language plpgsql
as $$
declare
  v_plan       plans;
  v_had_stock  boolean;
begin
  select * into v_plan from plans where id = p_plan_id for update;
  if not found then
    raise exception 'plan not found';
  end if;
  if v_plan.status not in ('pending_deposit', 'active') then
    return jsonb_build_object('ended', false, 'plan', to_jsonb(v_plan));
  end if;
  v_had_stock := v_plan.status = 'active';   -- stock is reserved from the first payment

  update plans set
    status          = case when p_reason = 'expired' then 'defaulted'::plan_status else 'cancelled'::plan_status end,
    ended_at        = now(),
    ended_reason    = p_reason,
    credited_amount = total_paid
  where id = p_plan_id
  returning * into v_plan;

  if v_had_stock then
    update products set stock_qty = stock_qty + 1, updated_at = now() where id = v_plan.product_id;
  end if;

  if v_plan.total_paid > 0 then
    insert into credit_entries (customer_id, amount, kind, plan_id, note, created_by)
    values (v_plan.customer_id, v_plan.total_paid, 'plan_ended', v_plan.id,
            case p_reason
              when 'expired' then 'Plan ' || v_plan.ref || ' reached its end date before it was fully paid'
              else 'Plan ' || v_plan.ref || ' was cancelled'
            end,
            p_by);
  end if;

  return jsonb_build_object('ended', true, 'plan', to_jsonb(v_plan));
end;
$$;

-- --------------------------------------------------------- spend_credit
-- Pays towards a plan from the customer's own store credit.
create function spend_credit(p_plan_ref text, p_amount integer, p_by text default null) returns jsonb
language plpgsql
as $$
declare
  v_plan    plans;
  v_balance integer;
begin
  select * into v_plan from plans where ref = p_plan_ref for update;
  if not found then
    raise exception 'plan not found';
  end if;
  if v_plan.status not in ('pending_deposit', 'active') then
    raise exception 'This plan is not accepting payments';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_plan.price - v_plan.total_paid then
    raise exception 'That is more than the balance on this plan';
  end if;

  -- One credit spend at a time per customer, so the balance can't go negative.
  perform 1 from customers where id = v_plan.customer_id for update;
  v_balance := credit_balance(v_plan.customer_id);
  if v_balance < p_amount then
    raise exception 'Not enough store credit';
  end if;

  insert into credit_entries (customer_id, amount, kind, plan_id, note, created_by)
  values (v_plan.customer_id, -p_amount, 'spent', v_plan.id, 'Used on plan ' || v_plan.ref, p_by);

  return record_payment('CREDIT-' || replace(gen_random_uuid()::text, '-', ''), p_plan_ref, p_amount,
                        'store_credit', null, 'credit', p_by, null);
end;
$$;

-- --------------------------------------------------------------- access
-- Money functions run only from the server (service-role key). Without this,
-- anyone holding the public anon key could call them through the REST API.
revoke execute on function record_payment(text, text, integer, text, jsonb, text, text, text) from public, anon, authenticated;
revoke execute on function end_plan(uuid, text, text) from public, anon, authenticated;
revoke execute on function spend_credit(text, integer, text) from public, anon, authenticated;
revoke execute on function credit_balance(uuid) from public, anon, authenticated;
grant execute on function record_payment(text, text, integer, text, jsonb, text, text, text) to service_role;
grant execute on function end_plan(uuid, text, text) to service_role;
grant execute on function spend_credit(text, integer, text) to service_role;
grant execute on function credit_balance(uuid) to service_role;

alter table credit_entries enable row level security;
alter table phone_codes    enable row level security;
