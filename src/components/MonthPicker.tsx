"use client";

import Link from "next/link";
import { useState } from "react";
import { formatGHS, perMonth } from "@/lib/money";

/**
 * Product page plan box (UI board #6): pick 1–6 months, see the monthly amount
 * and the small-small bar change live, then one orange button to start.
 */
export function MonthPicker({
  slug,
  price,
  minFirst,
  durations,
  initial = 3,
}: {
  slug: string;
  price: number;
  minFirst: number;
  durations: readonly number[];
  initial?: number;
}) {
  const [months, setMonths] = useState(initial);
  const monthly = perMonth(price, months);
  const now = new Date();
  const labels = Array.from({ length: months }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleString("en-GB", { month: "short" }),
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 md:gap-[18px] md:rounded-[18px] md:p-6">
      <fieldset>
        <legend className="mb-3 text-base font-semibold">Pay over how many months?</legend>
        <div className="grid grid-cols-6 gap-1.5 md:gap-2">
          {durations.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={m === months}
              onClick={() => setMonths(m)}
              className={`h-12 rounded-[10px] text-base font-semibold transition md:h-[52px] md:text-[17px] ${
                m === months ? "bg-ink text-white" : "border border-stone-300 bg-white hover:border-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </fieldset>

      {/* First segment = your first payment; the rest are the months still to pay. */}
      <div className="flex gap-1" role="img" aria-label={`${months} monthly payments`}>
        {labels.map((l, i) => (
          <div key={l + i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className={`h-3 w-full rounded-[3px] ${i === 0 ? "bg-brand" : "bg-[#f2c9b3]"}`} />
            <span className="hidden text-xs font-medium text-stone-500 md:block">{l}</span>
          </div>
        ))}
      </div>

      <p className="text-[15px] leading-normal md:text-base">
        <b className="font-display text-[22px] md:text-[26px]">{formatGHS(monthly)}</b> a month for {months}{" "}
        {months === 1 ? "month" : "months"}. Start with as little as <b>{formatGHS(minFirst)}</b>.
      </p>

      <Link
        href={`/start/${slug}?months=${months}`}
        className="flex h-[54px] items-center justify-center rounded-xl bg-brand text-base font-semibold text-white hover:bg-brand-dark md:h-14"
      >
        Start paying small small
      </Link>
      <p className="text-center text-[13px] text-stone-500">Collect from our shop when it&apos;s fully paid</p>
    </div>
  );
}
