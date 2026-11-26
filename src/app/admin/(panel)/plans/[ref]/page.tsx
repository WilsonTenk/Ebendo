import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorNote } from "@/components/ErrorNote";
import { Icon } from "@/components/Icon";
import { MonthBar } from "@/components/MonthBar";
import { isDemo } from "@/lib/catalog";
import { formatGHS } from "@/lib/money";
import { creditBalance, getPlanDetail, paymentLabel } from "@/lib/plan-data";
import { ENDED_REASON, STATUS_LABEL, fmtDate, fmtDateTime, localPhone } from "@/lib/plan-status";
import { balance, isOpen } from "@/lib/plans";
import { applyCreditByStaff, cancelPlanByStaff, markCollected } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Plan" };

const DONE: Record<string, string> = {
  cash: "Cash payment saved. The customer has been sent an SMS receipt.",
  credit: "Store credit applied. The customer has been sent an SMS receipt.",
  cancelled: "Plan cancelled. The item is back in stock and the money paid is now the customer's store credit.",
  collected: "Marked as collected.",
};

export default async function AdminPlan({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ error?: string; done?: string; receipt?: string }>;
}) {
  const [{ ref }, { error, done, receipt }] = await Promise.all([params, searchParams]);
  const plan = await getPlanDetail(ref);
  if (!plan) notFound();
  const credit = await creditBalance(plan.customer_id);

  const open = isOpen(plan);
  const ended = plan.status === "cancelled" || plan.status === "defaulted";
  const owed = balance(plan);
  const status = STATUS_LABEL[plan.status];
  const payments = [...plan.payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at));
  const creditUsable = Math.min(credit, owed);

  return (
    <>
      <nav className="text-sm text-stone-500">
        <Link href="/admin" className="hover:text-brand">
          Today &amp; plans
        </Link>{" "}
        / <span className="font-mono text-stone-700">{plan.ref}</span>
      </nav>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          {plan.customers.full_name} · {plan.products.name}
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
      </div>

      {done && DONE[done] && (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          <Icon name="check" className="h-5 w-5 shrink-0" />
          {DONE[done]}
          {receipt && <span className="font-semibold">Receipt {receipt}.</span>}
        </p>
      )}
      {error && (
        <div className="mt-5">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200 md:p-6">
            <p className="text-3xl font-black tracking-tight md:text-4xl">
              {formatGHS(plan.total_paid)} paid{" "}
              <span className="text-xl font-semibold text-stone-400 md:text-2xl">of {formatGHS(plan.price)}</span>
            </p>
            <div className="mt-4">
              <MonthBar
                price={plan.price}
                paid={plan.total_paid}
                months={plan.duration_months}
                start={plan.activated_at}
                tone={plan.status === "completed" || plan.status === "collected" ? "green" : open ? "brand" : "stone"}
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
              {ended ? (
                <span>
                  <b className="text-violet-700">{formatGHS(plan.credited_amount)}</b> moved to store credit
                </span>
              ) : (
                <span>
                  <b>{formatGHS(owed)}</b> left
                </span>
              )}
              <span className="text-stone-500">
                {ended && plan.ended_at
                  ? `${plan.ended_reason ? ENDED_REASON[plan.ended_reason] : "Ended"} · ${fmtDate(plan.ended_at)}`
                  : plan.due_date
                    ? `Ends ${fmtDate(plan.due_date)} · ${plan.duration_months}-month plan`
                    : "Waiting for the first payment"}
              </span>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200 md:p-6">
            <h2 className="text-lg font-bold">Payments</h2>
            {payments.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">No payments yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100">
                {payments.map((p, i) => (
                  <li key={`${p.paid_at}-${i}`} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{paymentLabel(p)}</p>
                      <p className="text-xs text-stone-500">
                        {fmtDateTime(p.paid_at)}
                        {p.receipt_no && ` · receipt ${p.receipt_no}`}
                        {p.recorded_by && ` · by ${p.recorded_by.split("@")[0]}`}
                        {p.note && ` · “${p.note}”`}
                      </p>
                    </div>
                    <p className={`shrink-0 font-bold ${p.method === "credit" ? "text-violet-700" : "text-green-700"}`}>
                      {formatGHS(p.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Actions</p>
            {open && (
              <Link
                href={`/admin/plans/${plan.ref}/cash`}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white hover:bg-brand-dark"
              >
                <Icon name="wallet" className="h-5 w-5" /> Record cash payment
              </Link>
            )}

            {plan.status === "completed" ? (
              <form action={markCollected}>
                <input type="hidden" name="id" value={plan.id} />
                <input type="hidden" name="ref" value={plan.ref} />
                <button
                  disabled={isDemo}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-white disabled:opacity-60"
                >
                  <Icon name="check" className="h-5 w-5" /> Mark collected
                </button>
              </form>
            ) : open ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-center text-sm text-stone-500">
                Mark collected · only when fully paid
              </p>
            ) : null}

            {open && creditUsable > 0 && (
              <form action={applyCreditByStaff} className="space-y-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-200">
                <input type="hidden" name="ref" value={plan.ref} />
                <p className="text-sm font-semibold text-violet-900">Customer has {formatGHS(credit)} store credit</p>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="sr-only">Credit to use (GHS)</span>
                    <input
                      name="amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      defaultValue={creditUsable / 100}
                      max={creditUsable / 100}
                      className="h-11 w-full rounded-lg border border-violet-200 bg-white px-3"
                    />
                  </label>
                  <button disabled={isDemo} className="rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white disabled:opacity-60">
                    Use credit
                  </button>
                </div>
              </form>
            )}

            {open && (
              <details className="rounded-xl ring-1 ring-red-200">
                <summary className="cursor-pointer list-none px-3 py-3 text-center text-sm font-semibold text-red-700">
                  Cancel plan → move {formatGHS(plan.total_paid)} to store credit
                </summary>
                <form action={cancelPlanByStaff} className="space-y-3 border-t border-red-100 p-3 text-sm">
                  <input type="hidden" name="ref" value={plan.ref} />
                  <p className="text-stone-600">
                    The {plan.products.name.toLowerCase()} goes back on sale and every cedi paid becomes{" "}
                    {plan.customers.full_name.split(" ")[0]}&apos;s store credit. No cash refunds.
                  </p>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" name="confirm" className="mt-0.5 h-5 w-5 accent-red-700" />
                    The customer asked to cancel this plan
                  </label>
                  <button disabled={isDemo} className="h-11 w-full rounded-lg bg-red-700 font-semibold text-white disabled:opacity-60">
                    Cancel plan
                  </button>
                </form>
              </details>
            )}
            {!open && plan.status !== "completed" && (
              <p className="text-sm text-stone-500">This plan is closed. Nothing more to do here.</p>
            )}
            {isDemo && <p className="text-xs text-stone-500">Buttons are switched off in preview mode.</p>}
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Customer</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-stone-500">Name</dt>
              <dd className="text-right">{plan.customers.full_name}</dd>
              <dt className="text-stone-500">Phone</dt>
              <dd className="text-right">{localPhone(plan.customers.phone)}</dd>
              <dt className="text-stone-500">Store credit</dt>
              <dd className={`text-right font-semibold ${credit > 0 ? "text-violet-700" : ""}`}>{formatGHS(credit)}</dd>
            </dl>
            <Link href={`/admin/customers/${plan.customer_id}`} className="mt-3 inline-block text-sm font-semibold text-brand">
              Open customer →
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
