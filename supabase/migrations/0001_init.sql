-- Ebendo: catalogue + "pay small small" layaway ledger.
-- All money is stored in pesewas (integer). GHS 1.00 = 100.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- products
create table products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  category     text not null default 'general',   -- appliances | electronics | furniture | phones ...
  description  text,
  price        integer not null check (price > 0),  -- pesewas
  image_url    text,
  stock_qty    integer not null default 0 check (stock_qty >= 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index products_category_idx on products (category) where active;

-- --------------------------------------------------------------- customers
create table customers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  phone       text not null unique,   -- E.164, e.g. +233550000000
  email       text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- plans
create type plan_status as enum (
  'pending_deposit', -- created, deposit not yet paid
  'active',          -- deposit paid, customer paying small small
  'completed',       -- fully paid, ready for pickup
  'collected',       -- customer has taken the item
  'cancelled',       -- abandoned / cancelled
  'defaulted'        -- past due date and unpaid (policy TBD with client)
);

create table plans (
  id               uuid primary key default gen_random_uuid(),
  ref              text not null unique,            -- public reference shown to customer
  customer_id      uuid not null references customers (id),
  product_id       uuid not null references products (id),
  price            integer not null check (price > 0),  -- price locked at plan creation
  total_paid       integer not null default 0 check (total_paid >= 0),
  duration_months  integer not null check (duration_months between 1 and 6),
  status           plan_status not null default 'pending_deposit',
  activated_at     timestamptz,
  due_date         date,                                -- set on activation
  completed_at     timestamptz,
  collected_at     timestamptz,
  last_reminded_at timestamptz,
  created_at       timestamptz not null default now()
);
create index plans_status_idx on plans (status);
create index plans_customer_idx on plans (customer_id);

-- ---------------------------------------------------------------- payments
create table payments (
  id                 uuid primary key default gen_random_uuid(),
  plan_id            uuid not null references plans (id),
  paystack_reference text not null unique,   -- idempotency key for webhooks
  amount             integer not null check (amount > 0),
  channel            text,                   -- mobile_money | card | ...
  paid_at            timestamptz not null default now(),
  raw                jsonb
);
create index payments_plan_idx on payments (plan_id);

-- --------------------------------------------------------------- reminders
create table reminders (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references plans (id),
  channel    text not null,     -- sms | email | whatsapp
  message    text not null,
  ok         boolean not null,
  error      text,
  sent_at    timestamptz not null default now()
);

-- ------------------------------------------------- record_payment (atomic)
-- Called from the Paystack webhook / callback. Idempotent on the reference:
-- a replayed webhook is a no-op. Returns {"inserted": bool, "plan": plan row}.
create or replace function record_payment(
  p_reference text,
  p_plan_ref  text,
  p_amount    integer,
  p_channel   text,
  p_raw       jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_plan plans;
  v_inserted boolean;
  v_was_pending boolean;
begin
  select * into v_plan from plans where ref = p_plan_ref for update;
  if not found then
    raise exception 'plan % not found', p_plan_ref;
  end if;
  v_was_pending := v_plan.status = 'pending_deposit';

  insert into payments (plan_id, paystack_reference, amount, channel, raw)
  values (v_plan.id, p_reference, p_amount, p_channel, p_raw)
  on conflict (paystack_reference) do nothing;
  get diagnostics v_inserted = row_count;

  if not v_inserted then
    return jsonb_build_object('inserted', false, 'plan', to_jsonb(v_plan));  -- already recorded
  end if;

  update plans set
    total_paid   = total_paid + p_amount,
    status = case
      when total_paid + p_amount >= price then 'completed'::plan_status
      when status = 'pending_deposit' then 'active'::plan_status
      else status
    end,
    activated_at = coalesce(activated_at, now()),
    due_date     = coalesce(due_date, (now() + make_interval(months => duration_months))::date),
    completed_at = case when total_paid + p_amount >= price then coalesce(completed_at, now()) else completed_at end
  where id = v_plan.id
  returning * into v_plan;

  -- Reserve the item the first time the plan gets money.
  -- (A plan cancelled for non-payment never reserved stock.)
  if v_was_pending then
    update products set stock_qty = greatest(stock_qty - 1, 0), updated_at = now()
    where id = v_plan.product_id;
  end if;

  return jsonb_build_object('inserted', true, 'plan', to_jsonb(v_plan));
end;
$$;

-- --------------------------------------------------------------------- RLS
-- The browser only ever reads active products. Everything else goes through
-- server routes using the service-role key, which bypasses RLS.
alter table products  enable row level security;
alter table customers enable row level security;
alter table plans     enable row level security;
alter table payments  enable row level security;
alter table reminders enable row level security;

create policy "public can read active products"
  on products for select using (active);

-- Public bucket for product photos (uploads go through the service-role key).
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;
