import { isDemo } from "./catalog";
import { DEMO_PRODUCTS } from "./demo-products";
import type { Plan } from "./plans";
import { supabaseAdmin } from "./supabase/admin";

export type PlanPayment = {
  amount: number;
  paid_at: string;
  channel: string | null;
  method: "paystack" | "cash" | "credit";
  receipt_no: string | null;
  recorded_by: string | null;
  note: string | null;
};

export type PlanDetail = Plan & {
  customers: { full_name: string; phone: string };
  products: { name: string; slug: string; category: string; image_url: string | null };
  payments: PlanPayment[];
};

export type CreditEntry = {
  id: string;
  amount: number;
  kind: "plan_ended" | "overpayment" | "spent" | "adjustment";
  note: string | null;
  created_by: string | null;
  created_at: string;
  plan_id: string | null;
};

export type Customer = { id: string; full_name: string; phone: string; email: string | null; created_at: string };

const SELECT =
  "*, customers(full_name, phone), products(name, slug, category, image_url), payments(amount, paid_at, channel, method, receipt_no, recorded_by, note)";

/** How a payment shows to people: "Mobile Money", "Cash at the shop", "Store credit". */
export function paymentLabel(p: Pick<PlanPayment, "method" | "channel">) {
  if (p.method === "cash") return "Cash at the shop";
  if (p.method === "credit") return "Store credit";
  if (p.channel === "card") return "Card";
  if (p.channel === "mobile_money") return "Mobile Money";
  return p.channel?.replace(/_/g, " ") ?? "Online";
}

// ------------------------------------------------------------ sample data
// Preview-mode plans (Supabase not configured). Fictional customers.

const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();
const date = (daysFromNow: number) => new Date(Date.now() + daysFromNow * DAY).toISOString().slice(0, 10);

type DemoPay = [cedis: number, daysAgo: number, how: "mobile_money" | "card" | "cash" | "credit", receipt?: string, by?: string];

function demoPlan(
  n: number,
  slug: string,
  customer: [string, string],
  status: Plan["status"],
  months: number,
  startedDaysAgo: number,
  payments: DemoPay[],
  ended?: { reason: NonNullable<Plan["ended_reason"]>; daysAgo: number },
): PlanDetail {
  const product = DEMO_PRODUCTS.find((p) => p.slug === slug)!;
  const total = payments.reduce((s, [c]) => s + c * 100, 0);
  return {
    id: `demo-plan-${n}`,
    ref: `EB-SAMPLE000${n}`,
    customer_id: `demo-customer-${n}`,
    product_id: product.id,
    price: product.price,
    total_paid: total,
    duration_months: months,
    status,
    activated_at: payments.length ? iso(startedDaysAgo) : null,
    due_date: payments.length ? date(months * 30 - startedDaysAgo) : null,
    completed_at: status === "completed" || status === "collected" ? iso(2) : null,
    collected_at: status === "collected" ? iso(1) : null,
    last_reminded_at: null,
    created_at: iso(startedDaysAgo),
    ended_at: ended ? iso(ended.daysAgo) : null,
    ended_reason: ended?.reason ?? null,
    credited_amount: ended ? total : 0,
    customers: { full_name: customer[0], phone: customer[1] },
    products: { name: product.name, slug: product.slug, category: product.category, image_url: product.image_url },
    payments: payments.map(([c, d, how, receipt, by]) => ({
      amount: c * 100,
      paid_at: iso(d),
      channel: how === "cash" ? "cash" : how === "credit" ? "store_credit" : how,
      method: how === "cash" ? "cash" : how === "credit" ? "credit" : "paystack",
      receipt_no: receipt ?? null,
      recorded_by: by ?? null,
      note: null,
    })),
  };
}

const DEMO_PLANS: PlanDetail[] = [
  demoPlan(1, "hisense-2-door-fridge-205l", ["Akosua Mensah", "+233240000001"], "active", 6, 70, [
    [530, 70, "mobile_money"],
    [900, 45, "cash", "C-0017", "kojo@ebendo.example"],
    [750, 20, "card"],
    [1000, 3, "mobile_money"],
  ]),
  demoPlan(2, "samsung-galaxy-a15", ["Kwame Boateng", "+233200000002"], "completed", 3, 80, [
    [500, 80, "mobile_money"],
    [800, 50, "cash", "C-0011", "abena@ebendo.example"],
    [1100, 2, "mobile_money"],
  ]),
  demoPlan(
    3,
    "3-seater-fabric-sofa",
    ["Ama Owusu", "+233550000003"],
    "defaulted",
    4,
    130,
    [
      [450, 130, "mobile_money"],
      [600, 90, "mobile_money"],
    ],
    { reason: "expired", daysAgo: 10 },
  ),
  demoPlan(4, "nasco-32-led-tv", ["Yaw Asante", "+233270000004"], "pending_deposit", 3, 0, []),
  demoPlan(5, "tecno-spark-20", ["Efua Addo", "+233240000005"], "collected", 2, 60, [
    [200, 60, "mobile_money"],
    [1650, 5, "card"],
  ]),
  demoPlan(6, "midea-split-air-conditioner-1-5hp", ["Kofi Darko", "+233500000006"], "active", 6, 10, [
    [700, 10, "cash", "C-0040", "abena@ebendo.example"],
  ]),
];

const DEMO_CUSTOMERS: Customer[] = DEMO_PLANS.map((p) => ({
  id: p.customer_id,
  full_name: p.customers.full_name,
  phone: p.customers.phone,
  email: null,
  created_at: p.created_at,
}));

const DEMO_CREDIT: Record<string, CreditEntry[]> = {
  "demo-customer-3": [
    {
      id: "demo-credit-1",
      amount: 1050_00,
      kind: "plan_ended",
      note: "Plan EB-SAMPLE0003 reached its end date before it was fully paid",
      created_by: null,
      created_at: iso(10),
      plan_id: "demo-plan-3",
    },
  ],
};

// ------------------------------------------------------------- plans

export async function getPlanDetail(ref: string): Promise<PlanDetail | null> {
  if (isDemo) return DEMO_PLANS.find((p) => p.ref === ref) ?? null;
  const { data } = await supabaseAdmin().from("plans").select(SELECT).eq("ref", ref).maybeSingle<PlanDetail>();
  return data;
}

/** Plans in the given statuses, newest first. `search` matches name, phone or reference. */
export async function listPlans(statuses: Plan["status"][], search?: string): Promise<PlanDetail[]> {
  const q = search?.trim().toLowerCase();
  if (isDemo) {
    return DEMO_PLANS.filter((p) => statuses.includes(p.status)).filter(
      (p) =>
        !q ||
        p.ref.toLowerCase().includes(q) ||
        p.customers.full_name.toLowerCase().includes(q) ||
        p.customers.phone.includes(q.replace(/^0/, "")),
    );
  }
  const db = supabaseAdmin();
  let query = db.from("plans").select(SELECT).in("status", statuses).order("created_at", { ascending: false }).limit(200);
  if (q) {
    // Search customers first, then filter plans by them (or by reference).
    const safe = q.replace(/[%,()]/g, "");
    const digits = safe.replace(/\D/g, "").replace(/^0/, "");
    const { data: found } = await db
      .from("customers")
      .select("id")
      .or(`full_name.ilike.%${safe}%${digits.length >= 4 ? `,phone.ilike.%${digits}%` : ""}`)
      .limit(50);
    const ids = (found ?? []).map((c) => c.id);
    query = query.or(`ref.ilike.%${safe}%${ids.length ? `,customer_id.in.(${ids.join(",")})` : ""}`);
  }
  const { data, error } = await query.returns<PlanDetail[]>();
  if (error) throw error;
  return data;
}

export type PlanTotals = {
  activeCount: number;
  readyCount: number;
  outstanding: number;
  overdueCount: number;
  receivedThisMonth: number;
  receivedToday: number;
  cashToday: number;
};

export async function planTotals(): Promise<PlanTotals> {
  type Row = Pick<Plan, "status" | "price" | "total_paid" | "due_date" | "activated_at" | "duration_months">;
  type Pay = Pick<PlanPayment, "amount" | "paid_at" | "method">;
  let rows: Row[];
  let pays: Pay[];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (isDemo) {
    rows = DEMO_PLANS;
    pays = DEMO_PLANS.flatMap((p) => p.payments);
  } else {
    const db = supabaseAdmin();
    const [{ data: plans }, { data: p }] = await Promise.all([
      db.from("plans").select("status, price, total_paid, due_date, activated_at, duration_months").in("status", ["active", "completed"]),
      db.from("payments").select("amount, paid_at, method").gte("paid_at", monthStart.toISOString()),
    ]);
    rows = plans ?? [];
    pays = p ?? [];
  }

  const active = rows.filter((p) => p.status === "active");
  // Store credit isn't new money, so it doesn't count as "received".
  const realMoney = pays.filter((p) => p.method !== "credit");
  return {
    activeCount: active.length,
    readyCount: rows.filter((p) => p.status === "completed").length,
    outstanding: active.reduce((s, p) => s + (p.price - p.total_paid), 0),
    overdueCount: active.filter((p) => isBehind(p, now)).length,
    receivedThisMonth: realMoney.filter((p) => new Date(p.paid_at) >= monthStart).reduce((s, p) => s + p.amount, 0),
    receivedToday: realMoney.filter((p) => new Date(p.paid_at) >= dayStart).reduce((s, p) => s + p.amount, 0),
    cashToday: realMoney
      .filter((p) => p.method === "cash" && new Date(p.paid_at) >= dayStart)
      .reduce((s, p) => s + p.amount, 0),
  };
}

/** Behind the even monthly pace (used for the "behind" flag in admin). */
export function isBehind(p: Pick<Plan, "price" | "total_paid" | "activated_at" | "due_date">, now = new Date()) {
  if (!p.activated_at || !p.due_date) return false;
  const start = new Date(p.activated_at).getTime();
  const end = new Date(p.due_date).getTime();
  const frac = Math.min(Math.max((now.getTime() - start) / (end - start), 0), 1);
  return p.total_paid < Math.ceil(p.price * frac) - 100; // GH₵1 tolerance for rounding
}

/** Number of plans in each status (for the admin tabs). */
export async function planCounts(): Promise<Record<Plan["status"], number>> {
  const counts: Record<Plan["status"], number> = {
    pending_deposit: 0,
    active: 0,
    completed: 0,
    collected: 0,
    cancelled: 0,
    defaulted: 0,
  };
  let statuses: Plan["status"][];
  if (isDemo) statuses = DEMO_PLANS.map((p) => p.status);
  else {
    const { data } = await supabaseAdmin().from("plans").select("status");
    statuses = (data ?? []).map((r) => r.status);
  }
  for (const s of statuses) counts[s]++;
  return counts;
}

// ------------------------------------------------------- customers + credit

export async function getCustomer(id: string): Promise<Customer | null> {
  if (isDemo) return DEMO_CUSTOMERS.find((c) => c.id === id) ?? null;
  const { data } = await supabaseAdmin().from("customers").select("*").eq("id", id).maybeSingle<Customer>();
  return data;
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  if (isDemo) return DEMO_CUSTOMERS.find((c) => c.phone === phone) ?? null;
  const { data } = await supabaseAdmin().from("customers").select("*").eq("phone", phone).maybeSingle<Customer>();
  return data;
}

export async function customerPlans(customerId: string): Promise<PlanDetail[]> {
  if (isDemo) return DEMO_PLANS.filter((p) => p.customer_id === customerId);
  const { data, error } = await supabaseAdmin()
    .from("plans")
    .select(SELECT)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .returns<PlanDetail[]>();
  if (error) throw error;
  return data;
}

export async function creditEntries(customerId: string): Promise<CreditEntry[]> {
  if (isDemo) return DEMO_CREDIT[customerId] ?? [];
  const { data, error } = await supabaseAdmin()
    .from("credit_entries")
    .select("id, amount, kind, note, created_by, created_at, plan_id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .returns<CreditEntry[]>();
  if (error) throw error;
  return data;
}

export async function creditBalance(customerId: string): Promise<number> {
  return (await creditEntries(customerId)).reduce((s, e) => s + e.amount, 0);
}

export const SAMPLE_PLAN_REF = "EB-SAMPLE0001";
/** Preview mode: a sample plan still waiting for its first payment. */
export const DEMO_PENDING_REF = "EB-SAMPLE0004";
