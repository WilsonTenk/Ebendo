import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { payTowardsPlan } from "@/app/actions";
import { payWithCredit } from "@/app/credit-actions";
import { ErrorNote } from "@/components/ErrorNote";
import { MonthBar } from "@/components/MonthBar";
import { PayBox } from "@/components/PayBox";
import { PlanCodeForm } from "@/components/PlanCodeForm";
import { isDemo } from "@/lib/catalog";
import { rules } from "@/lib/config";
import { maskPhone, verifiedPhone } from "@/lib/customer-auth";
import { formatGHS } from "@/lib/money";
import { creditBalance, getPlanDetail, paymentLabel } from "@/lib/plan-data";
import { ENDED_REASON, fmtDate } from "@/lib/plan-status";
import { balance } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My plan", robots: { index: false } };

/** A short, friendly name for the item: "fridge", "sofa", "phone"… */
function shortItem(name: string, category: string) {
  const n = name.toLowerCase();
  for (const w of ["fridge", "freezer", "tv", "sofa", "bed", "wardrobe", "cooker", "blender", "air conditioner", "home theatre"]) {
    if (n.includes(w)) return w === "tv" ? "TV" : w;
  }
  return category === "phones" ? "phone" : "item";
}

/** My plan (UI board #9): one answer at the top, the small-small bar, Pay visible without scrolling. */
export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ error?: string; paid?: string; credit?: string; sent?: string }>;
}) {
  const [{ ref }, { error, paid, credit: wantsCredit, sent }] = await Promise.all([params, searchParams]);
  const plan = await getPlanDetail(ref);
  if (!plan) notFound();
  // A plan with no first payment yet belongs to step 3 of starting a plan.
  if (plan.status === "pending_deposit" && !error) redirect(`/plan/${ref}/pay`);

  const verified = (await verifiedPhone()) === plan.customers.phone;
  const credit = verified ? await creditBalance(plan.customer_id) : 0;
  const owed = balance(plan);
  const paying = plan.status === "active";
  const ended = plan.status === "cancelled" || plan.status === "defaulted";
  const done = plan.status === "completed" || plan.status === "collected";
  const item = shortItem(plan.products.name, plan.products.category);
  const firstName = plan.customers.full_name.split(" ")[0];
  const min = Math.min(rules.minPayment, owed);
  const payments = [...plan.payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at));

  const summary = (
    <div className="flex flex-col gap-3.5">
      <p className="flex flex-wrap justify-between gap-2 text-[15px] text-stone-600 md:text-base">
        <span>
          Hi {firstName}, here&apos;s your {item} plan
        </span>
        <span className="font-mono text-[13px] font-semibold tracking-wider text-stone-500 md:text-sm">{plan.ref}</span>
      </p>
      <h1 className="font-display text-[40px] font-extrabold leading-[1.02] tracking-tight md:text-6xl md:leading-none">
        {formatGHS(plan.total_paid)} paid{" "}
        <span className="block text-[28px] font-semibold text-stone-400 md:inline md:text-4xl">of {formatGHS(plan.price)}</span>
      </h1>
      <div className="mt-1">
        <MonthBar
          price={plan.price}
          paid={plan.total_paid}
          months={plan.duration_months}
          start={plan.activated_at}
          tone={done ? "green" : ended ? "stone" : "brand"}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-[15px] md:text-[17px]">
        {done ? (
          <span className="font-semibold text-green-700">Fully paid</span>
        ) : ended ? (
          <span className="font-semibold text-credit">{formatGHS(plan.credited_amount)} moved to store credit</span>
        ) : (
          <span>
            <b>{formatGHS(owed)}</b> left
          </span>
        )}
        {plan.due_date && paying && <span className="text-stone-600">Finish by {fmtDate(plan.due_date)}</span>}
        {plan.completed_at && done && <span className="text-stone-600">Paid off {fmtDate(plan.completed_at)}</span>}
      </div>
    </div>
  );

  const history = (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-xl font-extrabold md:text-2xl">Payments</h2>
      {payments.length === 0 ? (
        <p className="py-3 text-sm text-stone-500">No payments yet.</p>
      ) : (
        <ul>
          {payments.map((p, i) => (
            <li key={`${p.paid_at}-${i}`} className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-0">
              <span>
                <span className="block text-[15px] font-medium">{fmtDate(p.paid_at)}</span>
                <span className="text-[13px] text-stone-500">
                  {i === payments.length - 1 ? "First payment · " : ""}
                  {paymentLabel(p)}
                  {p.receipt_no && ` · receipt ${p.receipt_no}`}
                </span>
              </span>
              <b className={p.method === "credit" ? "text-credit" : ""}>{formatGHS(p.amount)}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const collectNote = (
    <section className="flex flex-col gap-1 rounded-[14px] border border-dashed border-stone-300 p-4 md:rounded-2xl md:p-[18px]">
      <span className="text-sm font-semibold md:text-[15px]">When it&apos;s fully paid</span>
      <span className="text-sm leading-normal text-stone-600">
        Bring this reference to our shop behind Accra Brewery, Graphic Road, and take your {item} home.
      </span>
    </section>
  );

  return (
    <main className="mx-auto max-w-7xl px-5 pb-10 pt-6 md:px-8 md:pt-10 xl:px-16">
      {paid && (
        <p role="status" className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          <b>Payment received. Thank you!</b> An SMS receipt is on its way.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_420px] lg:gap-14">
        <div className="flex flex-col gap-7">
          {summary}
          <div className="hidden lg:block">{history}</div>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <ErrorNote message={error} />

          {paying && <PayBox action={payTowardsPlan} planRef={plan.ref} min={min} owed={owed} disabled={isDemo} />}

          {/* Store credit */}
          {paying &&
            (verified && credit > 0 ? (
              <form action={payWithCredit} className="flex flex-col gap-3 rounded-2xl border border-[#d8cdeb] bg-credit-soft p-5">
                <input type="hidden" name="ref" value={plan.ref} />
                <p className="font-bold text-credit">You have {formatGHS(credit)} store credit</p>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
                  Amount to use (GH₵)
                  <input
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    defaultValue={Math.min(credit, owed) / 100}
                    max={Math.min(credit, owed) / 100}
                    className="h-12 rounded-xl border border-[#d8cdeb] bg-white px-4 font-bold"
                  />
                </label>
                <button className="h-12 rounded-xl bg-credit font-semibold text-white">Pay from store credit</button>
              </form>
            ) : wantsCredit || sent ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
                <p className="font-bold">Use store credit</p>
                {verified ? (
                  <p className="text-sm text-stone-600">You don&apos;t have any store credit right now.</p>
                ) : (
                  <PlanCodeForm planRef={plan.ref} next={`/plan/${plan.ref}`} masked={maskPhone(plan.customers.phone)} sent={Boolean(sent)} />
                )}
              </div>
            ) : (
              <Link href={`/plan/${plan.ref}?credit=1`} className="text-center text-sm font-semibold text-credit underline-offset-4 hover:underline">
                Have store credit? Use it on this plan
              </Link>
            ))}

          {plan.status === "completed" && (
            <section className="rounded-2xl bg-green-50 p-5 ring-1 ring-green-200 md:p-6">
              <p className="text-lg font-bold text-green-900">Your {item} is ready to collect!</p>
              <p className="mt-1 text-[15px] leading-normal text-green-900/80">
                Bring your reference <b className="whitespace-nowrap font-mono">{plan.ref}</b> to our shop behind Accra Brewery,
                Graphic Road.
              </p>
              <Link href="/contact" className="mt-4 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-white">
                Directions and opening hours
              </Link>
            </section>
          )}

          {plan.status === "collected" && (
            <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
              <p className="text-lg font-bold">Collected. Enjoy your {item}!</p>
              <p className="mt-1 text-[15px] text-stone-600">
                {plan.collected_at && `Collected on ${fmtDate(plan.collected_at, "long")}. `}Thank you for shopping with Ebendo.
              </p>
              <Link href="/shop" className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4">
                Shop for something else
              </Link>
            </section>
          )}

          {ended && (
            <section className="rounded-2xl bg-credit-soft p-5 ring-1 ring-[#d8cdeb] md:p-6">
              <p className="text-lg font-bold text-credit">This plan has ended</p>
              <p className="mt-1 text-[15px] leading-normal text-stone-700">
                {plan.ended_reason ? ENDED_REASON[plan.ended_reason] : "The plan ended"}
                {plan.ended_at && ` on ${fmtDate(plan.ended_at, "long")}`}. The {item} went back on sale.
                {plan.credited_amount > 0 && ` Your ${formatGHS(plan.credited_amount)} is safe as store credit — use it on any item.`}
              </p>
              {plan.credited_amount > 0 && (
                <Link href="/credit" className="mt-4 inline-flex h-11 items-center rounded-xl bg-credit px-5 text-sm font-semibold text-white">
                  See my store credit
                </Link>
              )}
            </section>
          )}

          {paying && collectNote}

          {paying && (
            <Link href={`/plan/${plan.ref}/cancel`} className="text-center text-sm text-stone-500 hover:text-red-700">
              Can&apos;t continue? Cancel this plan
            </Link>
          )}
        </div>

        <div className="lg:hidden">{history}</div>
      </div>
    </main>
  );
}
