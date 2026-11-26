import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { payTowardsPlan } from "@/app/actions";
import { payWithCredit } from "@/app/credit-actions";
import { ErrorNote } from "@/components/ErrorNote";
import { PlanCodeForm } from "@/components/PlanCodeForm";
import { PlanSummary, StepHeader } from "@/components/StartSteps";
import { isDemo } from "@/lib/catalog";
import { maskPhone, verifiedPhone } from "@/lib/customer-auth";
import { formatGHS } from "@/lib/money";
import { creditBalance, getPlanDetail } from "@/lib/plan-data";
import { balance, minDeposit } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Start a plan · First payment", robots: { index: false } };

/** Start a plan, step 3 of 3: the first payment, by MoMo/card (Paystack), store credit, or cash at the shop. */
export default async function FirstPayment({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ error?: string; sent?: string; credit?: string }>;
}) {
  const [{ ref }, { error, sent, credit: wantsCredit }] = await Promise.all([params, searchParams]);
  const plan = await getPlanDetail(ref);
  if (!plan) notFound();
  if (plan.status !== "pending_deposit") redirect(`/plan/${ref}`);

  const min = minDeposit(plan.price);
  const owed = balance(plan);
  const verified = (await verifiedPhone()) === plan.customers.phone;
  const credit = verified ? await creditBalance(plan.customer_id) : 0;
  const creditUse = Math.min(credit, owed);
  const product = { ...plan.products, price: plan.price };
  const self = `/plan/${ref}/pay`;

  return (
    <main className="mx-auto grid max-w-7xl items-start gap-8 px-5 pb-10 pt-3 md:px-8 md:pt-10 lg:grid-cols-[1fr_400px] lg:gap-16 xl:px-16">
      <div className="flex max-w-[560px] flex-col gap-6 md:gap-7">
        <StepHeader
          step={3}
          backHref={`/start/${plan.products.slug}?months=${plan.duration_months}`}
          backLabel="Back to your details"
        />
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight md:text-[40px]">Your first payment</h1>
          <p className="mt-2 text-[15px] text-stone-600 md:text-base">
            Hi {plan.customers.full_name.split(" ")[0]}, your plan reference is{" "}
            <b className="font-mono tracking-wide text-ink">{ref}</b>. We&apos;ll text it to you too.
          </p>
        </div>

        <ErrorNote message={error} />

        {/* Store credit: pays the first payment without Paystack */}
        {verified && creditUse >= min ? (
          <form action={payWithCredit} className="flex flex-col gap-3 rounded-[14px] border border-[#d8cdeb] bg-credit-soft p-4">
            <input type="hidden" name="ref" value={ref} />
            <input type="hidden" name="step" value="first" />
            <p className="text-[15px] font-bold text-credit">You have {formatGHS(credit)} store credit</p>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
              Credit to use (GH₵)
              <input
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={min / 100}
                max={creditUse / 100}
                defaultValue={creditUse / 100}
                className="h-12 rounded-xl border border-[#d8cdeb] bg-white px-4 text-lg font-bold"
              />
            </label>
            <button className="h-[52px] rounded-xl bg-credit text-base font-semibold text-white">
              Start plan with store credit
            </button>
            <p className="text-center text-xs text-stone-500">No Paystack step needed</p>
          </form>
        ) : verified && credit > 0 ? (
          <p className="rounded-[14px] bg-credit-soft p-4 text-sm text-credit">
            You have {formatGHS(credit)} store credit, but the first payment must be at least {formatGHS(min)}. Pay the first
            payment below, then use your credit on your plan page.
          </p>
        ) : verified ? null : wantsCredit || sent ? (
          <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4">
            <p className="font-bold">Use your store credit</p>
            <PlanCodeForm planRef={ref} next={self} masked={maskPhone(plan.customers.phone)} sent={Boolean(sent)} />
          </div>
        ) : (
          <a href={`${self}?credit=1`} className="text-sm font-semibold text-credit underline underline-offset-4">
            Have Ebendo store credit? Use it for this payment
          </a>
        )}

        {/* MoMo or card through Paystack */}
        <form action={payTowardsPlan} className="flex flex-col gap-4">
          <input type="hidden" name="ref" value={ref} />
          <input type="hidden" name="step" value="first" />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Amount to pay now (GH₵)
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              required
              min={min / 100}
              max={owed / 100}
              defaultValue={Math.ceil(min / 100)}
              className="h-14 rounded-xl border border-stone-300 bg-white px-4 text-[22px] font-bold focus:border-ink focus:outline-none"
            />
            <span className="text-[13px] font-normal text-stone-500">
              At least {formatGHS(min)}. Pay more if you like — it all goes to your balance.
            </span>
          </label>
          <button
            disabled={isDemo}
            className="h-[54px] rounded-xl bg-brand text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-50 md:h-14"
          >
            Pay with MoMo or card
          </button>
          <p className="text-center text-[13px] text-stone-500">
            {isDemo ? "Payments are switched off in preview mode." : "Secure payment by Paystack"}
          </p>
        </form>

        <p className="rounded-xl border border-dashed border-stone-300 px-4 py-3 text-[13px] leading-normal text-stone-600">
          <b className="text-ink">Prefer cash?</b> Bring your reference <b className="whitespace-nowrap font-mono text-ink">{ref}</b> to our shop on Graphic Road within 48 hours and
          pay the first payment at the counter.
        </p>
      </div>

      <PlanSummary
        product={product}
        months={plan.duration_months}
        minFirst={min}
        changeHref={`/products/${plan.products.slug}`}
      />
    </main>
  );
}
