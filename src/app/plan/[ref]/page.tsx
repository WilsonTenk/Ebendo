import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { payTowardsPlan } from "@/app/actions";
import { ErrorNote } from "@/components/ErrorNote";
import { rules } from "@/lib/config";
import { formatGHS } from "@/lib/money";
import { balance, minDeposit, type Plan } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My plan", robots: { index: false } };

type Row = Plan & {
  customers: { full_name: string };
  products: { name: string; image_url: string | null };
  payments: { amount: number; paid_at: string; channel: string | null }[];
};

const STATUS_TEXT: Record<Plan["status"], string> = {
  pending_deposit: "Waiting for your first payment",
  active: "Paying small small",
  completed: "Fully paid — ready for pickup",
  collected: "Collected",
  cancelled: "Cancelled",
  defaulted: "Overdue",
};

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ error?: string; paid?: string }>;
}) {
  const [{ ref }, { error, paid }] = await Promise.all([params, searchParams]);
  const { data: plan } = await supabaseAdmin()
    .from("plans")
    .select("*, customers(full_name), products(name, image_url), payments(amount, paid_at, channel)")
    .eq("ref", ref)
    .maybeSingle<Row>();
  if (!plan) notFound();

  const owed = balance(plan);
  const pct = Math.round((plan.total_paid / plan.price) * 100);
  const canPay = plan.status === "pending_deposit" || plan.status === "active";
  const min = plan.status === "pending_deposit" ? minDeposit(plan.price) : Math.min(rules.minPayment, owed);
  const payments = [...plan.payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at));

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {paid && (
        <p className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          Payment received. Thank you! An SMS receipt is on its way.
        </p>
      )}
      <p className="text-sm text-stone-500">Plan {plan.ref}</p>
      <h1 className="mt-1 text-2xl font-bold">{plan.products.name}</h1>
      <p className="text-stone-600">For {plan.customers.full_name.split(" ")[0]}</p>

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-medium text-brand">{STATUS_TEXT[plan.status]}</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-stone-500">Price</dt>
            <dd className="font-semibold">{formatGHS(plan.price)}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Paid</dt>
            <dd className="font-semibold">{formatGHS(plan.total_paid)}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Balance</dt>
            <dd className="font-semibold">{formatGHS(owed)}</dd>
          </div>
        </dl>
        {plan.due_date && (
          <p className="mt-3 text-sm text-stone-500">
            Finish paying by {new Date(plan.due_date).toLocaleDateString("en-GH", { dateStyle: "long" })}
          </p>
        )}
        {plan.status === "completed" && (
          <p className="mt-4 rounded-lg bg-stone-50 px-4 py-3 text-sm">
            Bring this reference ({plan.ref}) to our shop behind Accra Brewery, Graphic Road, to collect your item.
          </p>
        )}
      </div>

      {canPay && (
        <form action={payTowardsPlan} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Make a payment</h2>
          <ErrorNote message={error} />
          <input type="hidden" name="ref" value={plan.ref} />
          <label className="block text-sm">
            Amount (GHS) — {formatGHS(min)} to {formatGHS(owed)}
            <input
              name="amount"
              required
              type="number"
              inputMode="decimal"
              step="0.01"
              min={min / 100}
              max={owed / 100}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          <button className="w-full rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            Pay with Mobile Money or card
          </button>
        </form>
      )}

      <h2 className="mt-10 font-semibold">Payment history</h2>
      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">No payments yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white text-sm">
          {payments.map((p) => (
            <li key={p.paid_at} className="flex justify-between px-4 py-3">
              <span>
                {new Date(p.paid_at).toLocaleDateString("en-GH", { dateStyle: "medium" })}
                <span className="ml-2 text-stone-400">{p.channel?.replace("_", " ")}</span>
              </span>
              <span className="font-medium">{formatGHS(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
