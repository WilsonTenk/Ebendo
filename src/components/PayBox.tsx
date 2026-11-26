"use client";

import { useState } from "react";
import { formatGHS } from "@/lib/money";

/**
 * "Pay small small" box on My plan (UI board #9): quick amounts, any amount,
 * one orange button that says exactly what will be paid.
 */
export function PayBox({
  action,
  planRef,
  min,
  owed,
  disabled = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  planRef: string;
  min: number; // pesewas
  owed: number; // pesewas
  disabled?: boolean;
}) {
  const quick = [50_00, 100_00, 200_00, 500_00].filter((a) => a >= min && a < owed);
  const start = quick.includes(500_00) ? 500_00 : (quick.at(-1) ?? owed);
  const [cedis, setCedis] = useState(String(start / 100));
  const amount = Math.round(Number(cedis) * 100);
  const valid = Number.isFinite(amount) && amount >= min && amount <= owed;

  return (
    <form action={action} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 md:gap-4 md:rounded-[20px] md:p-6">
      <input type="hidden" name="ref" value={planRef} />
      <h2 className="font-sans text-[17px] font-bold md:text-[19px]">Pay small small</h2>
      {quick.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {quick.map((a) => {
            const on = amount === a;
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => setCedis(String(a / 100))}
                className={`h-11 rounded-[10px] text-[15px] font-semibold md:h-[46px] ${on ? "bg-ink text-white" : "border border-stone-300 bg-white hover:border-ink"}`}
              >
                {a / 100}
              </button>
            );
          })}
        </div>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Amount (GH₵)
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={min / 100}
          max={owed / 100}
          required
          value={cedis}
          onChange={(e) => setCedis(e.target.value)}
          className="h-14 rounded-xl border border-stone-300 bg-white px-4 text-[22px] font-bold focus:border-ink focus:outline-none md:h-[58px] md:text-2xl"
        />
        <span className="text-[13px] font-normal text-stone-500">
          From {formatGHS(min)} up to {formatGHS(owed)}
        </span>
      </label>
      <button
        disabled={disabled || !valid}
        className="h-[54px] rounded-xl bg-brand text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-50 md:h-14"
      >
        {valid ? `Pay ${formatGHS(amount)} with MoMo or card` : "Pay with MoMo or card"}
      </button>
      {amount !== owed && (
        <button type="button" onClick={() => setCedis(String(owed / 100))} className="text-sm font-semibold underline-offset-4 hover:underline">
          Pay the full {formatGHS(owed)} instead
        </button>
      )}
      <p className="text-center text-xs text-stone-500">
        {disabled ? "Payments are switched off in preview mode." : "Secure payment by Paystack · or pay cash at the shop"}
      </p>
    </form>
  );
}
