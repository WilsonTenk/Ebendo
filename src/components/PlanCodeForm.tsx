import { confirmCode, sendPlanCode } from "@/app/credit-actions";
import { DEMO_CODE } from "@/lib/customer-auth";
import { isDemo } from "@/lib/catalog";

/**
 * Two small steps to prove the person owns the phone on a plan:
 * "Text me a code" → enter the 6 digits. `next` is where to come back to.
 */
export function PlanCodeForm({
  planRef,
  next,
  masked,
  sent,
}: {
  planRef: string;
  next: string;
  masked: string;
  sent: boolean;
}) {
  if (!sent) {
    return (
      <form action={sendPlanCode} className="space-y-2">
        <input type="hidden" name="ref" value={planRef} />
        <input type="hidden" name="next" value={next} />
        <p className="text-sm text-stone-600">First we&apos;ll text a 6-digit code to {masked} to check it&apos;s you.</p>
        <button className="h-12 w-full rounded-xl bg-ink font-semibold text-white hover:bg-stone-800">Text me a code</button>
      </form>
    );
  }
  return (
    <div className="space-y-2">
      <form action={confirmCode} className="space-y-2">
        <input type="hidden" name="ref" value={planRef} />
        <input type="hidden" name="next" value={next} />
        <label className="block text-sm font-semibold">
          Enter the code we texted to {masked}
          <input
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="••••••"
            className="mt-1.5 h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-center font-mono text-2xl tracking-[0.5em]"
          />
        </label>
        <button className="h-12 w-full rounded-xl bg-ink font-semibold text-white hover:bg-stone-800">Confirm</button>
      </form>
      <form action={sendPlanCode}>
        <input type="hidden" name="ref" value={planRef} />
        <input type="hidden" name="next" value={next} />
        <button className="text-sm font-semibold text-brand">Send a new code</button>
      </form>
      {isDemo && <p className="text-xs text-stone-500">Preview mode: no SMS is sent. Use {DEMO_CODE}.</p>}
    </div>
  );
}
