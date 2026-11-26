import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ErrorNote } from "@/components/ErrorNote";
import { isDemo } from "@/lib/catalog";
import { rules } from "@/lib/config";
import { formatGHS } from "@/lib/money";
import { getPlanDetail } from "@/lib/plan-data";
import { localPhone } from "@/lib/plan-status";
import { balance, isOpen, minDeposit } from "@/lib/plans";
import { recordCash } from "../../../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Record cash" };

export default async function RecordCash({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ ref }, { error }] = await Promise.all([params, searchParams]);
  const plan = await getPlanDetail(ref);
  if (!plan) notFound();
  if (!isOpen(plan)) redirect(`/admin/plans/${ref}?error=${encodeURIComponent("This plan is not taking payments")}`);

  const owed = balance(plan);
  const first = plan.status === "pending_deposit";
  const min = first ? minDeposit(plan.price) : Math.min(rules.minPayment, owed);
  const quick = [100_00, 200_00, 500_00].filter((a) => a >= min && a < owed);
  const input = "h-14 w-full rounded-xl border border-stone-300 bg-white px-4";

  return (
    <>
      <nav className="text-sm text-stone-500">
        <Link href="/admin" className="hover:text-brand">
          Today &amp; plans
        </Link>{" "}
        /{" "}
        <Link href={`/admin/plans/${ref}`} className="font-mono hover:text-brand">
          {ref}
        </Link>{" "}
        / Record cash
      </nav>
      <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Record a cash payment</h1>

      <form action={recordCash} className="mt-6 max-w-xl space-y-5 rounded-2xl bg-white p-5 ring-1 ring-stone-200 md:p-6">
        <input type="hidden" name="ref" value={ref} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Plan</p>
          <p className="mt-1 font-semibold">
            {plan.customers.full_name} · {plan.products.name}
          </p>
          <p className="text-sm text-stone-500">
            {localPhone(plan.customers.phone)} · {formatGHS(owed)} left to pay
            {first && ` · first payment must be at least ${formatGHS(min)}`}
          </p>
        </div>

        <ErrorNote message={error} />

        <label className="block text-sm font-semibold">
          Cash received (GH₵)
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={min / 100}
            max={owed / 100}
            required
            className={`${input} mt-1.5 text-2xl font-bold`}
          />
          <span className="mt-1 block text-xs font-normal text-stone-500">
            From {formatGHS(min)} up to {formatGHS(owed)}
            {quick.length > 0 && ` · common: ${quick.map(formatGHS).join(", ")}`}
          </span>
        </label>

        <label className="block text-sm font-semibold">
          Note <span className="font-normal text-stone-400">(optional)</span>
          <input name="note" maxLength={200} placeholder="e.g. paid by her brother" className={`${input} mt-1.5 h-12`} />
        </label>

        <label className="flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-sm font-medium ring-1 ring-stone-200">
          <input type="checkbox" name="counted" className="h-5 w-5 accent-ink" />
          I have counted the cash and it&apos;s in the drawer
        </label>

        <p className="text-xs leading-relaxed text-stone-500">
          Saved with your name, the time and a receipt number. The customer gets the same SMS receipt as an online payment.
          Cash entries can&apos;t be edited or deleted.
        </p>

        <div className="flex gap-3">
          <button
            disabled={isDemo}
            className="h-12 flex-1 rounded-xl bg-brand font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Save cash payment
          </button>
          <Link href={`/admin/plans/${ref}`} className="flex h-12 items-center rounded-xl px-5 font-semibold ring-1 ring-stone-300">
            Cancel
          </Link>
        </div>
        {isDemo && <p className="text-xs text-stone-500">Saving is switched off in preview mode.</p>}
      </form>
    </>
  );
}
