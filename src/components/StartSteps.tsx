import Link from "next/link";
import { formatGHS, perMonth } from "@/lib/money";
import { CategoryIcon } from "./CategoryIcon";

const STEPS = ["Choose plan", "Your details", "First payment"] as const;

/** "Step 2 of 3 · Your details": a 3-part bar on phones, numbered steps on desktop. */
export function StepHeader({ step, backHref, backLabel }: { step: 2 | 3; backHref: string; backLabel: string }) {
  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center gap-1">
          <Link href={backHref} aria-label={backLabel} className="-ml-3 flex h-11 w-11 items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
          </Link>
          <span className="text-[15px] font-semibold">
            Step {step} of 3 · {STEPS[step - 1]}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-sm ${i < step ? "bg-ink" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <Link href={backHref} className="hidden text-sm font-semibold text-stone-600 hover:text-brand md:block">
        ← {backLabel}
      </Link>
      <ol className="hidden gap-7 md:flex" aria-label="Steps">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const now = n === step;
          return (
            <li key={s} aria-current={now ? "step" : undefined} className={`flex items-center gap-2.5 text-[15px] ${now ? "font-semibold" : done ? "" : "text-stone-400"}`}>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${
                  done || now ? "bg-ink text-white" : "border border-stone-300 bg-white text-stone-400"
                }`}
              >
                {done ? "✓" : n}
              </span>
              {s}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** "Your plan" summary, always visible before any money moves. */
export function PlanSummary({
  product,
  months,
  minFirst,
  changeHref,
  paid = 0,
}: {
  product: { name: string; category: string; price: number; image_url: string | null };
  months: number;
  minFirst: number;
  changeHref: string;
  paid?: number;
}) {
  return (
    <aside className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5 md:p-6 lg:sticky lg:top-24">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-stone-400">Your plan</p>
      <div className="flex items-center gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-tile md:h-[72px] md:w-[72px] md:rounded-xl">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- product photos come from Supabase storage
            <img src={product.image_url} alt="" className="h-full w-full object-contain p-1.5" />
          ) : (
            <CategoryIcon category={product.category} className="h-8 w-8 text-stone-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{product.name}</p>
          <Link href={changeHref} className="text-[13px] font-semibold hover:text-brand">
            Change
          </Link>
        </div>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-y-3 text-[15px]">
        <dt className="text-stone-500">Price (locked)</dt>
        <dd className="font-semibold">{formatGHS(product.price)}</dd>
        <dt className="text-stone-500">Plan</dt>
        <dd>
          {months} {months === 1 ? "month" : "months"}
        </dd>
        <dt className="text-stone-500">About</dt>
        <dd>{formatGHS(perMonth(product.price, months))} a month</dd>
        {paid > 0 && (
          <>
            <dt className="text-stone-500">Paid so far</dt>
            <dd>{formatGHS(paid)}</dd>
          </>
        )}
        <dt className="border-t border-line pt-3 font-semibold">First payment from</dt>
        <dd className="border-t border-line pt-3 font-bold">{formatGHS(minFirst)}</dd>
      </dl>
      <p className="rounded-xl border border-line bg-paper px-3.5 py-3 text-[13px] leading-normal text-stone-600">
        We set the item aside once your first payment comes in. Collect it from our shop when it&apos;s fully paid.
      </p>
    </aside>
  );
}
