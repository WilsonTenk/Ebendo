import type { Metadata } from "next";
import Link from "next/link";
import { confirmCode, sendCreditCode, signOutCustomer } from "@/app/credit-actions";
import { ErrorNote } from "@/components/ErrorNote";
import { isDemo } from "@/lib/catalog";
import { DEMO_CODE, maskPhone, pendingPhone, verifiedPhone } from "@/lib/customer-auth";
import { formatGHS } from "@/lib/money";
import { creditEntries, customerPlans, getCustomerByPhone } from "@/lib/plan-data";
import { ENDED_REASON, fmtDate } from "@/lib/plan-status";
import { isOpen } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Store credit", robots: { index: false } };

const input = "mt-1.5 h-14 w-full rounded-xl border border-stone-300 bg-white px-4";

export default async function StoreCredit({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; ended?: string }>;
}) {
  const { error, sent, ended } = await searchParams;
  const phone = await verifiedPhone();

  if (!phone) {
    const sentTo = sent ? await pendingPhone() : null;
    return (
      <main className="mx-auto max-w-md px-4 py-12 md:py-16">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Your store credit</h1>
        <p className="mt-3 text-stone-600">
          Money from a plan that was cancelled or ended unpaid is kept here as credit. Enter your phone number to see it.
        </p>
        <div className="mt-6">
          <ErrorNote message={error} />
        </div>
        {sentTo ? (
          <form action={confirmCode} className="mt-6 space-y-3 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
            <input type="hidden" name="next" value="/credit" />
            <label className="block text-sm font-semibold">
              Enter the code we texted to {maskPhone(sentTo)}
              <input
                name="code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                className={`${input} text-center font-mono text-2xl tracking-[0.5em]`}
              />
            </label>
            <button className="h-12 w-full rounded-xl bg-ink font-semibold text-white">Show my credit</button>
            <Link href="/credit" className="block text-center text-sm font-semibold text-brand">
              Use a different number
            </Link>
            {isDemo && <p className="text-xs text-stone-500">Preview mode: no SMS is sent. Use {DEMO_CODE}.</p>}
          </form>
        ) : (
          <form action={sendCreditCode} className="mt-6 space-y-3 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
            <label className="block text-sm font-semibold">
              Phone number
              <input name="phone" type="tel" required autoComplete="tel" placeholder="024 000 0000" className={input} />
            </label>
            <button className="h-12 w-full rounded-xl bg-ink font-semibold text-white">Text me a code</button>
            {isDemo && <p className="text-xs text-stone-500">Preview mode: try 055 000 0003 (Ama, who has credit).</p>}
          </form>
        )}
      </main>
    );
  }

  const customer = await getCustomerByPhone(phone);
  const [entries, plans] = customer ? await Promise.all([creditEntries(customer.id), customerPlans(customer.id)]) : [[], []];
  const balance = entries.reduce((s, e) => s + e.amount, 0);
  const endedPlans = plans.filter((p) => p.credited_amount > 0);
  const openPlans = plans.filter(isOpen);

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:py-14 lg:grid-cols-[1fr_400px]">
      <div>
        {ended && (
          <p className="mb-6 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900 ring-1 ring-violet-200">
            Plan {ended} is cancelled. The item is back on sale and what you paid is now in your store credit.
          </p>
        )}
        <p className="text-stone-600">Hi {customer?.full_name.split(" ")[0] ?? "there"}, you have</p>
        <p className="mt-2 font-display text-6xl font-extrabold tracking-tight text-violet-700 md:text-7xl">{formatGHS(balance)}</p>
        <p className="mt-2 text-lg font-semibold">Ebendo store credit</p>
        <p className="mt-3 max-w-lg leading-relaxed text-stone-600">
          Use it on any item: start a new plan and use your credit as the first payment, or put it towards a plan you&apos;re
          already paying. It can&apos;t be paid out in cash.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/shop" className="inline-flex h-12 items-center rounded-xl bg-ink px-6 font-semibold text-white">
            Shop with my credit
          </Link>
          <form action={signOutCustomer}>
            <button className="text-sm font-semibold text-stone-600 hover:text-brand">Not you? Sign out</button>
          </form>
        </div>

        {openPlans.length > 0 && balance > 0 && (
          <div className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
            <p className="font-semibold">Put it towards a plan you&apos;re paying</p>
            <ul className="mt-2 divide-y divide-stone-100">
              {openPlans.map((p) => (
                <li key={p.id}>
                  <Link href={`/plan/${p.ref}?credit=1`} className="flex justify-between gap-3 py-3 hover:text-brand">
                    <span>{p.products.name}</span>
                    <span className="font-semibold">Use credit →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        {endedPlans.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{p.products.name}</span>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600">Ended</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {p.ended_reason ? ENDED_REASON[p.ended_reason] : "Plan ended"}
              {p.ended_at && ` (${fmtDate(p.ended_at)})`}. The item went back on sale. Your {formatGHS(p.credited_amount)} is
              safe as credit.
            </p>
          </div>
        ))}
        <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <h2 className="font-bold">Credit history</h2>
          {entries.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No store credit yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100">
              {entries.map((e) => (
                <li key={e.id} className="flex justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{e.note ?? (e.amount > 0 ? "Credit added" : "Credit used")}</span>
                    <span className="text-xs text-stone-500">{fmtDate(e.created_at)}</span>
                  </span>
                  <b className={`shrink-0 ${e.amount > 0 ? "text-violet-700" : "text-stone-700"}`}>
                    {e.amount > 0 ? "+" : "−"}
                    {formatGHS(Math.abs(e.amount))}
                  </b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </main>
  );
}
