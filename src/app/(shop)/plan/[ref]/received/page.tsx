import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MonthBar } from "@/components/MonthBar";
import { isDemo } from "@/lib/catalog";
import { maskPhone } from "@/lib/customer-auth";
import { formatGHS } from "@/lib/money";
import { getPlanDetail, paymentLabel } from "@/lib/plan-data";
import { balance } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment received", robots: { index: false } };

const RECENT_MS = 60 * 60_000; // show the receipt for an hour after paying; after that, the plan page

/** Payment received (UI board #10): a real success screen with a short receipt. */
export default async function PaymentReceived({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const plan = await getPlanDetail(ref);
  if (!plan) notFound();

  const latest = [...plan.payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at))[0];
  const recent = latest && (isDemo || Date.now() - new Date(latest.paid_at).getTime() < RECENT_MS);
  if (!recent) redirect(`/plan/${ref}`);

  const done = plan.status === "completed" || plan.status === "collected";
  const firstName = plan.customers.full_name.split(" ")[0];
  const left = balance(plan);

  return (
    <main className="mx-auto flex max-w-7xl justify-center px-5 pb-10 pt-12 md:px-8 md:pb-20 md:pt-16">
      <div className="flex w-full max-w-[560px] flex-col items-center gap-3.5 text-center md:gap-4">
        <span className={`flex h-[72px] w-[72px] items-center justify-center rounded-full md:h-20 md:w-20 ${done ? "bg-green-700" : "bg-ink"}`}>
          <svg viewBox="0 0 24 24" className="h-[34px] w-[34px] md:h-[38px] md:w-[38px]" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 className="mt-2 text-[34px] font-extrabold leading-[1.05] tracking-tight md:text-5xl">
          {formatGHS(latest.amount)} received
        </h1>
        <p className="text-base leading-normal text-stone-600 md:text-[17px]">
          {done ? (
            <>
              That&apos;s it, {firstName} — your plan is <b className="text-green-700">fully paid</b>. Your {plan.products.name} is ready
              to collect.
            </>
          ) : (
            <>Thank you, {firstName}.</>
          )}{" "}
          An SMS receipt is on its way to {maskPhone(plan.customers.phone)}.
        </p>

        <div className="mt-4 flex w-full flex-col gap-4 rounded-2xl border border-line bg-white p-5 text-left md:gap-[18px] md:rounded-[20px] md:p-6">
          <MonthBar price={plan.price} paid={plan.total_paid} months={plan.duration_months} start={plan.activated_at} tone={done ? "green" : "brand"} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[15px]">
            <dt className="text-stone-500">Item</dt>
            <dd className="text-right">{plan.products.name}</dd>
            <dt className="text-stone-500">Paid with</dt>
            <dd className="text-right">{paymentLabel(latest)}</dd>
            <dt className="text-stone-500">Paid so far</dt>
            <dd className="text-right font-bold">{formatGHS(plan.total_paid)}</dd>
            <dt className="text-stone-500">Left to pay</dt>
            <dd className={`text-right font-bold ${done ? "text-green-700" : ""}`}>{done ? "Nothing — fully paid" : formatGHS(left)}</dd>
            <dt className="text-stone-500">Reference</dt>
            <dd className="text-right font-mono text-[13px] font-semibold md:text-sm">{plan.ref}</dd>
          </dl>
        </div>

        <div className="mt-3 flex w-full flex-col gap-2.5 md:w-auto md:flex-row md:gap-3">
          {done ? (
            <Link href="/contact" className="inline-flex h-[54px] items-center justify-center rounded-xl bg-ink px-7 font-semibold text-white">
              How to collect it
            </Link>
          ) : (
            <Link href={`/plan/${ref}`} className="inline-flex h-[54px] items-center justify-center rounded-xl bg-ink px-7 font-semibold text-white">
              Back to my plan
            </Link>
          )}
          <Link href="/shop" className="inline-flex h-12 items-center justify-center rounded-xl px-7 font-semibold md:h-[54px] md:border md:border-stone-300 md:bg-white">
            Keep shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
