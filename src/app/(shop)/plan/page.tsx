import type { Metadata } from "next";
import { findPlan } from "@/app/actions";
import { textMyReferences } from "@/app/credit-actions";
import { ErrorNote } from "@/components/ErrorNote";
import { isDemo } from "@/lib/catalog";
import { SAMPLE_PLAN_REF } from "@/lib/plan-data";

export const metadata: Metadata = { title: "Track my plan" };

/** Track my plan (UI board #8): just the form, plus "Lost your reference?" by SMS (#26). */
export default async function PlanLookup({ searchParams }: { searchParams: Promise<{ error?: string; texted?: string }> }) {
  const { error, texted } = await searchParams;
  return (
    <main className="mx-auto flex max-w-7xl justify-center px-5 pb-12 pt-10 md:px-8 md:pb-24 md:pt-[72px] xl:px-16">
      <div className="flex w-full max-w-[520px] flex-col gap-8">
        <form
          action={findPlan}
          className="flex flex-col gap-4 md:gap-[18px] md:rounded-[22px] md:border md:border-line md:bg-white md:p-9"
        >
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-[44px]">Check your plan</h1>
          <p className="text-base leading-normal text-stone-600 md:text-[17px]">
            Enter the plan reference from your SMS receipt to see your balance and pay.
          </p>
          <ErrorNote message={error && !texted ? error : undefined} />
          <label className="mt-1 flex flex-col gap-1.5 text-sm font-semibold">
            Plan reference
            <input
              name="ref"
              required
              placeholder="EB-XXXXXXXXXX"
              defaultValue={isDemo ? SAMPLE_PLAN_REF : undefined}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="h-14 rounded-xl border border-stone-300 bg-white px-4 font-mono text-lg font-semibold uppercase tracking-[1.5px] focus:border-ink focus:outline-none md:h-[58px] md:text-[19px]"
            />
          </label>
          <button className="h-[54px] rounded-xl bg-ink text-base font-semibold text-white hover:bg-stone-800 md:h-14">
            Show my plan
          </button>
          {isDemo && <p className="text-xs text-stone-500">Preview: sample plans are EB-SAMPLE0001 to EB-SAMPLE0006.</p>}
        </form>

        <section className="flex flex-col gap-3 border-t border-line pt-6 md:border-0 md:px-2 md:pt-0">
          <h2 className="font-sans text-base font-bold md:text-[17px]">Lost your reference?</h2>
          {texted ? (
            <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
              If that number has a plan with us, we&apos;ve texted the reference to it. It can take a minute to arrive.
            </p>
          ) : (
            <>
              <p className="text-sm leading-normal text-stone-600 md:text-[15px]">
                Enter the phone number you used. We&apos;ll text your plan reference to it.
              </p>
              <form action={textMyReferences} className="flex gap-2 md:gap-2.5">
                <label className="flex min-w-0 flex-1">
                  <span className="sr-only">Phone number</span>
                  <input
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="024 000 0000"
                    className="h-[52px] min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3.5 text-base focus:border-ink focus:outline-none"
                  />
                </label>
                <button className="h-[52px] shrink-0 rounded-xl border border-ink px-5 text-[15px] font-semibold hover:bg-ink hover:text-white">
                  Text it
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
