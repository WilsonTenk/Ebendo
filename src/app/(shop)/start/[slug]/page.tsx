import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startPlan } from "@/app/actions";
import { ErrorNote } from "@/components/ErrorNote";
import { PlanSummary, StepHeader } from "@/components/StartSteps";
import { getProduct } from "@/lib/catalog";
import { rules } from "@/lib/config";
import { minDeposit } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Start a plan · Your details", robots: { index: false } };

const field = "h-[52px] w-full rounded-xl border bg-white px-3.5 text-base font-normal focus:outline-none";

/** Start a plan, step 2 of 3 (UI board #7): who the plan is for. Summary always visible. */
export default async function StartPlanDetails({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ months?: string; error?: string }>;
}) {
  const [{ slug }, { months: rawMonths, error }] = await Promise.all([params, searchParams]);
  const product = await getProduct(slug);
  if (!product) notFound();
  const months = (rules.durations as readonly number[]).includes(Number(rawMonths)) ? Number(rawMonths) : 3;
  const phoneError = error?.toLowerCase().includes("phone") || error?.includes("digits") ? error : undefined;
  const otherError = phoneError ? undefined : error;

  return (
    <main className="mx-auto grid max-w-7xl items-start gap-8 px-5 pb-10 pt-3 md:px-8 md:pt-10 lg:grid-cols-[1fr_400px] lg:gap-16 xl:px-16">
      <div className="flex max-w-[560px] flex-col gap-6 md:gap-7">
        <StepHeader step={2} backHref={`/products/${slug}`} backLabel={`Back to the ${product.name.toLowerCase()}`} />

        {/* Phones: the summary first, compact */}
        <div className="lg:hidden">
          <PlanSummary product={product} months={months} minFirst={minDeposit(product.price)} changeHref={`/products/${slug}`} />
        </div>

        <h1 className="text-[28px] font-extrabold tracking-tight md:text-[40px]">Who is this plan for?</h1>
        <ErrorNote message={otherError} />

        <form action={startPlan} className="flex flex-col gap-5">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
          <input type="hidden" name="months" value={months} />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Full name
            <input name="fullName" required minLength={2} autoComplete="name" className={`${field} border-stone-300 focus:border-ink`} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Phone number
            <input
              name="phone"
              required
              type="tel"
              autoComplete="tel"
              placeholder="024 000 0000"
              pattern="[0-9 +]{10,16}"
              title="Enter all 10 digits, e.g. 024 000 0000"
              aria-invalid={phoneError ? true : undefined}
              aria-describedby={phoneError ? "phone-error" : undefined}
              className={`${field} ${phoneError ? "border-2 border-red-700" : "border-stone-300 focus:border-ink"}`}
            />
            {phoneError && (
              <span id="phone-error" className="text-[13px] font-medium text-red-700">
                {phoneError}
              </span>
            )}
            <span className="text-[13px] font-normal text-stone-500">Your receipts, balance and reminders come here by SMS.</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            <span>
              Email <span className="font-normal text-stone-500">(optional)</span>
            </span>
            <input name="email" type="email" autoComplete="email" className={`${field} border-stone-300 focus:border-ink`} />
          </label>
          <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-center md:gap-5">
            <button className="h-[54px] shrink-0 whitespace-nowrap rounded-xl bg-ink px-7 text-base font-semibold text-white hover:bg-stone-800 md:h-14">
              Continue to first payment
            </button>
            <span className="text-center text-[13px] text-stone-500 md:text-left">
              Next: choose your first amount and pay by MoMo, card or store credit
            </span>
          </div>
        </form>
      </div>

      <div className="hidden lg:block">
        <PlanSummary product={product} months={months} minFirst={minDeposit(product.price)} changeHref={`/products/${slug}`} />
      </div>
    </main>
  );
}
