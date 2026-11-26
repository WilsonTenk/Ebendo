"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatGHS } from "@/lib/money";

export type HeroExample = {
  name: string;
  price: number; // pesewas
  monthly: number; // pesewas, for the 6-month plan
  href: string;
  months: string[]; // 6 short month labels, starting this month
};

const STEP_MS = 1300;
const HOLD_STEPS = 3; // extra ticks to rest on "ready to collect"
const TICKS = ["Price locked from day one", "MoMo or card", "SMS receipt every time"];

/**
 * Home hero (UI board: Home / Home · desktop). The visual is a live example
 * plan: the month bar fills one payment at a time until the item is ready to
 * collect, and the SMS receipt updates with it.
 */
export function Hero({ example }: { example: HeroExample | null }) {
  const total = 6;
  const [tick, setTick] = useState(3);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!example || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnimate(true);
    setTick(1);
    const t = setInterval(() => setTick((s) => (s >= total + HOLD_STEPS ? 1 : s + 1)), STEP_MS);
    return () => clearInterval(t);
  }, [example]);

  const paidMonths = Math.min(tick, total);
  const done = paidMonths === total;
  const paid = example ? Math.min(paidMonths * example.monthly, example.price) : 0;
  const left = example ? example.price - paid : 0;
  const lastPayment = example ? paid - Math.min((paidMonths - 1) * example.monthly, example.price) : 0;

  return (
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-10 pt-7 md:px-8 xl:px-16 md:pb-20 md:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      {/* Words */}
      <div className="flex flex-col gap-5 md:gap-6">
        <p className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-stone-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Graphic Road, Accra · pay small small
        </p>
        <h1 className="font-display text-[50px] font-extrabold leading-[0.98] tracking-[-0.04em] md:text-7xl lg:text-[64px] lg:leading-[0.95] xl:text-[84px]">
          Pay small small.
          <br />
          <span className="text-brand">Carry it home.</span>
        </h1>
        <p className="max-w-md text-[17px] leading-relaxed text-stone-600 md:text-[19px]">
          Fridges, TVs, phones and furniture. Lock today&apos;s price, pay with Mobile Money over 1 to 6 months, and
          collect your item once it&apos;s fully paid.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/shop"
            className="inline-flex h-[52px] items-center rounded-xl bg-ink px-7 text-base font-semibold text-white hover:bg-stone-800 md:h-14"
          >
            Browse the shop
          </Link>
          <Link href="/plan" className="text-[15px] font-semibold underline underline-offset-4 hover:text-brand">
            Already paying? Track my plan
          </Link>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600">
          {TICKS.map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className="font-bold text-brand">✓</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Live example plan */}
      {example && (
        <div className="relative mx-auto w-full max-w-[560px] pb-28 lg:pb-14">
          <div className="relative h-[270px] overflow-hidden rounded-3xl bg-brand md:h-[440px] md:rounded-[32px] lg:mr-10">
            <div className="absolute -bottom-20 -right-16 h-56 w-56 rounded-full border-[24px] border-white/10 md:h-80 md:w-80 md:border-[32px]" />
            <Fridge className="absolute left-7 top-6 h-[236px] md:left-14 md:top-auto md:-bottom-3.5 md:h-[420px]" />
          </div>

          {/* SMS receipt */}
          <div
            key={paidMonths}
            aria-hidden
            className={`absolute right-3 top-4 w-[186px] rounded-2xl rounded-tr-md bg-white px-3 py-2.5 text-xs leading-snug shadow-[0_12px_28px_-12px_rgba(26,23,20,0.4)] md:right-0 md:top-8 md:w-60 ${
              animate ? "animate-[fade_.45s_ease]" : ""
            }`}
          >
            <p className="flex justify-between font-bold">
              Ebendo <span className="font-normal text-stone-400">now</span>
            </p>
            <p className="mt-0.5 text-stone-600">
              {done ? (
                <>Fully paid! Your item is ready to collect at our shop.</>
              ) : (
                <>
                  Payment of {formatGHS(lastPayment)} received. Balance: <b className="text-ink">{formatGHS(left)}</b>.
                </>
              )}
            </p>
          </div>

          {/* Plan card */}
          <Link
            href={example.href}
            className="absolute inset-x-3 bottom-0 flex flex-col gap-3.5 rounded-[20px] border border-line bg-white p-[18px] shadow-[0_24px_48px_-24px_rgba(26,23,20,0.35)] md:inset-x-auto md:right-0 md:w-[360px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Example plan</p>
                <p className="mt-0.5 truncate text-[15px] font-bold">{example.name}</p>
              </div>
              <p className="shrink-0 text-right leading-tight">
                <span className="block text-[15px] font-bold">{formatGHS(example.monthly)}</span>
                <span className="text-xs text-stone-500">a month</span>
              </p>
            </div>
            <div className="flex gap-[5px]" role="img" aria-label={`${paidMonths} of ${total} monthly payments made`}>
              {example.months.map((m, i) => (
                <div key={m + i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="h-2.5 w-full overflow-hidden rounded-[3px] bg-line">
                    <div
                      className={`h-full transition-[width] duration-500 ease-out ${done ? "bg-green-700" : "bg-brand"}`}
                      style={{ width: i < paidMonths ? "100%" : "0%" }}
                    />
                  </div>
                  <span className={`text-[11px] font-medium ${i < paidMonths ? "text-ink" : "text-stone-400"}`}>{m}</span>
                </div>
              ))}
            </div>
            <div className="flex items-end justify-between">
              <p className="text-[13px] leading-tight">
                <span className="block text-xs text-stone-500">Paid</span>
                <b className="text-[15px] tabular-nums">{formatGHS(paid)}</b>
                <span className="text-stone-400"> / {formatGHS(example.price)}</span>
              </p>
              {done ? (
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800">✓ Ready to collect</span>
              ) : (
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold tabular-nums text-brand-dark">
                  {formatGHS(left)} left
                </span>
              )}
            </div>
          </Link>
        </div>
      )}
    </section>
  );
}

/** Flat two-door fridge (stands in until real product photos arrive). */
function Fridge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 400" className={className} aria-hidden>
      <path d="M176 14h18a10 10 0 0 1 10 10v350a10 10 0 0 1-10 10h-18Z" fill="#E7E0D5" />
      <rect x="12" y="8" width="176" height="118" rx="14" fill="#FFFFFF" />
      <rect x="12" y="132" width="176" height="252" rx="14" fill="#FFFFFF" />
      <rect x="12" y="126" width="176" height="6" fill="#D9D1C4" />
      <rect x="152" y="40" width="9" height="62" rx="4.5" fill="#1A1714" />
      <rect x="152" y="156" width="9" height="110" rx="4.5" fill="#1A1714" />
      <rect x="36" y="150" width="34" height="6" rx="3" fill="#E7E0D5" />
      <rect x="28" y="384" width="22" height="10" rx="3" fill="#1A1714" />
      <rect x="150" y="384" width="22" height="10" rx="3" fill="#1A1714" />
    </svg>
  );
}
