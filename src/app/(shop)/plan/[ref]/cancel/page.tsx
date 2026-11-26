import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelPlanByCustomer } from "@/app/credit-actions";
import { ErrorNote } from "@/components/ErrorNote";
import { PlanCodeForm } from "@/components/PlanCodeForm";
import { maskPhone, verifiedPhone } from "@/lib/customer-auth";
import { formatGHS } from "@/lib/money";
import { getPlanDetail } from "@/lib/plan-data";
import { isOpen } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cancel plan", robots: { index: false } };

export default async function CancelPlan({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const [{ ref }, { error, sent }] = await Promise.all([params, searchParams]);
  const plan = await getPlanDetail(ref);
  if (!plan) notFound();
  if (!isOpen(plan)) redirect(`/plan/${ref}`);

  const verified = (await verifiedPhone()) === plan.customers.phone;
  const item = plan.products.name;
  const paid = plan.total_paid;

  return (
    <main className="mx-auto max-w-xl px-4 py-10 md:py-14">
      <Link href={`/plan/${ref}`} className="text-sm font-semibold text-stone-600 hover:text-brand">
        ← Back to my plan
      </Link>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">Stop paying for this item?</h1>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-2xl bg-white p-5 text-sm ring-1 ring-stone-200">
        <dt className="text-stone-500">Item</dt>
        <dd className="text-right font-medium">{item}</dd>
        <dt className="text-stone-500">Reference</dt>
        <dd className="text-right font-mono">{ref}</dd>
        <dt className="text-stone-500">You have paid</dt>
        <dd className="text-right font-bold">{formatGHS(paid)}</dd>
      </dl>

      <ol className="mt-6 space-y-3">
        {[
          <>The {item.toLowerCase()} goes back on sale for other customers.</>,
          paid > 0 ? (
            <>
              All <b className="text-ink">{formatGHS(paid)}</b> you paid moves to your Ebendo store credit.
            </>
          ) : (
            <>You haven&apos;t paid anything yet, so there is nothing to move to store credit.</>
          ),
          <>Use the credit on any item in the shop, any time. We don&apos;t refund cash.</>,
        ].map((t, i) => (
          <li key={i} className="flex gap-3 text-stone-600">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-0.5">{t}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <ErrorNote message={error} />
      </div>

      <div className="mt-6 space-y-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
        <Link
          href={`/plan/${ref}`}
          className="flex h-12 items-center justify-center rounded-xl bg-brand font-semibold text-white hover:bg-brand-dark"
        >
          Keep paying
        </Link>
        <div className="border-t border-stone-100 pt-4">
          {verified ? (
            <form action={cancelPlanByCustomer}>
              <input type="hidden" name="ref" value={ref} />
              <button className="h-12 w-full rounded-xl font-semibold text-red-700 ring-1 ring-red-300 hover:bg-red-50">
                {paid > 0 ? `Cancel and move ${formatGHS(paid)} to store credit` : "Cancel this plan"}
              </button>
            </form>
          ) : (
            <PlanCodeForm planRef={ref} next={`/plan/${ref}/cancel`} masked={maskPhone(plan.customers.phone)} sent={Boolean(sent)} />
          )}
        </div>
      </div>
    </main>
  );
}
