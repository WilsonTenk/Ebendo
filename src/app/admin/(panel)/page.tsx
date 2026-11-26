import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { MonthBar } from "@/components/MonthBar";
import { isDemo } from "@/lib/catalog";
import { formatGHS } from "@/lib/money";
import { isBehind, listPlans, planCounts, planTotals, type PlanDetail } from "@/lib/plan-data";
import { STATUS_LABEL, fmtDate, localPhone } from "@/lib/plan-status";
import type { Plan } from "@/lib/plans";
import { markCollected } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Today" };

type Tab = { id: string; label: string; statuses: Plan["status"][]; behindOnly?: boolean };
const TABS: Tab[] = [
  { id: "all", label: "All open", statuses: ["pending_deposit", "active", "completed"] },
  { id: "paying", label: "Paying", statuses: ["active"] },
  { id: "pickup", label: "Pickup", statuses: ["completed"] },
  { id: "behind", label: "Behind", statuses: ["active"], behindOnly: true },
  { id: "pending", label: "No first payment", statuses: ["pending_deposit"] },
  { id: "ended", label: "Ended → credit", statuses: ["cancelled", "defaulted"] },
  { id: "collected", label: "Collected", statuses: ["collected"] },
];

/** Status text + the date that matters for this plan. */
function statusOf(p: PlanDetail) {
  const behind = p.status === "active" && isBehind(p);
  if (behind) return { label: "Behind", tone: "text-red-700 font-semibold", sub: p.due_date ? `ends ${fmtDate(p.due_date)}` : "" };
  if (p.status === "completed") return { label: "Fully paid", tone: "text-green-700 font-semibold", sub: "Ready for pickup" };
  if (p.status === "active") return { label: "On track", tone: "text-stone-500", sub: p.due_date ? `ends ${fmtDate(p.due_date)}` : "" };
  if (p.status === "pending_deposit") return { label: "No first payment", tone: "text-stone-500", sub: `started ${fmtDate(p.created_at)}` };
  if (p.status === "collected") return { label: "Collected", tone: "text-stone-500", sub: p.collected_at ? fmtDate(p.collected_at) : "" };
  return { label: STATUS_LABEL[p.status].label, tone: "text-credit font-semibold", sub: `${formatGHS(p.credited_amount)} to credit` };
}

function CollectButton({ p, full = false }: { p: PlanDetail; full?: boolean }) {
  return (
    <form action={markCollected}>
      <input type="hidden" name="id" value={p.id} />
      <button
        disabled={isDemo}
        className={`h-10 whitespace-nowrap rounded-[10px] bg-ink px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60 ${full ? "h-12 w-full rounded-xl text-[15px]" : ""}`}
      >
        Mark collected
      </button>
    </form>
  );
}

/** Today & plans (UI board #13): "Today" first, then one list with filters and search. */
export default async function AdminToday({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab: rawTab, q } = await searchParams;
  const tab = TABS.find((t) => t.id === rawTab) ?? TABS[0];
  const search = q?.trim() || undefined;
  const statuses = search ? [...new Set(TABS.flatMap((t) => t.statuses))] : tab.statuses;
  const [found, totals, counts] = await Promise.all([listPlans(statuses, search), planTotals(), planCounts()]);
  const plans = !search && tab.behindOnly ? found.filter((p) => isBehind(p)) : found;
  const count = (t: Tab) => (t.behindOnly ? totals.overdueCount : t.statuses.reduce((s, st) => s + counts[st], 0));

  const stats = [
    { label: "Ready for pickup", value: String(totals.readyCount), tone: "" },
    { label: "Behind on payments", value: String(totals.overdueCount), tone: totals.overdueCount ? "text-red-700" : "" },
    {
      label: "Received today",
      value: formatGHS(totals.receivedToday),
      tone: "",
      note: totals.cashToday ? `${formatGHS(totals.cashToday)} in cash` : undefined,
    },
    { label: "Still to be paid", value: formatGHS(totals.outstanding), tone: "" },
  ];

  return (
    <div className="flex flex-col gap-6 md:gap-7">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[30px] font-extrabold tracking-tight md:text-4xl">Today</h1>
        <span className="text-sm text-stone-500">
          {isDemo ? "Sample data · " : ""}
          {new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      {/* Phones: one list; computers: four cards */}
      <ul className="rounded-2xl border border-line bg-white md:grid md:grid-cols-4 md:gap-4 md:border-0 md:bg-transparent">
        {stats.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between gap-3 border-b border-line p-4 last:border-0 md:flex-col md:items-start md:gap-1.5 md:rounded-2xl md:border md:bg-white md:p-5 md:last:border"
          >
            <span className="text-[15px] md:text-sm md:text-stone-500">{s.label}</span>
            <span className="text-right md:text-left">
              <b className={`font-display text-xl md:text-[32px] md:tracking-tight ${s.tone}`}>{s.value}</b>
              {s.note && <span className="block text-xs text-stone-500">{s.note}</span>}
            </span>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 md:gap-4 md:rounded-[18px] md:border md:border-line md:bg-white md:p-5 md:pb-2">
        <div className="flex flex-col gap-3 md:flex-row-reverse md:items-center md:justify-between">
          <form action="/admin" className="flex md:w-80">
            <label className="flex h-12 flex-1 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 text-stone-500 md:h-11">
              <Icon name="search" className="h-[18px] w-[18px]" />
              <span className="sr-only">Search plans</span>
              <input
                name="q"
                type="search"
                defaultValue={search}
                placeholder="Name, phone or reference"
                className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none md:text-[15px]"
              />
            </label>
          </form>
          {search ? (
            <p className="text-sm text-stone-600">
              {plans.length} {plans.length === 1 ? "plan" : "plans"} for “{search}” ·{" "}
              <Link href="/admin" className="font-semibold text-brand">
                Clear
              </Link>
            </p>
          ) : (
            <nav className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" aria-label="Filter plans">
              {TABS.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin?tab=${t.id}`}
                  aria-current={t.id === tab.id ? "page" : undefined}
                  className={`inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm ${
                    t.id === tab.id ? "bg-ink font-semibold text-white" : "border border-stone-300 hover:border-ink"
                  }`}
                >
                  {t.label} {count(t)}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {plans.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center text-stone-500 md:mb-3">
            {search ? "No plans match. Try a name, a phone number or the reference." : "No plans here right now."}
          </p>
        ) : (
          <>
            {/* Phones: cards */}
            <ul className="flex flex-col gap-2.5 md:hidden">
              {plans.map((p) => {
                const s = statusOf(p);
                return (
                  <li key={p.id} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4">
                    <Link href={`/admin/plans/${p.ref}`} className="flex flex-col gap-2.5">
                      <span className="flex justify-between gap-2.5">
                        <span className="min-w-0">
                          <span className="block text-base font-semibold">{p.customers.full_name}</span>
                          <span className="block truncate text-[13px] text-stone-500">
                            {p.products.name} · {localPhone(p.customers.phone)}
                          </span>
                        </span>
                        <span className={`shrink-0 text-[13px] ${s.tone}`}>{s.label}</span>
                      </span>
                      {p.status !== "completed" && (
                        <>
                          <MonthBar price={p.price} paid={p.total_paid} months={p.duration_months} size="sm" tone={p.status === "active" ? "brand" : "stone"} />
                          <span className="text-[13px] text-stone-600">
                            {formatGHS(p.total_paid)} of {formatGHS(p.price)}
                            {s.sub && ` · ${s.sub}`}
                          </span>
                        </>
                      )}
                    </Link>
                    {p.status === "completed" && <CollectButton p={p} full />}
                  </li>
                );
              })}
            </ul>

            {/* Computers: table */}
            <table className="hidden w-full border-collapse text-sm md:table">
              <thead>
                <tr className="text-left text-[13px] font-semibold text-stone-400">
                  <th className="px-3 py-2.5 font-semibold">Customer</th>
                  <th className="px-3 py-2.5 font-semibold">Item</th>
                  <th className="px-3 py-2.5 font-semibold">Paid</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => {
                  const s = statusOf(p);
                  return (
                    <tr key={p.id} className="border-t border-line align-middle">
                      <td className="whitespace-nowrap px-3 py-4">
                        <Link href={`/admin/plans/${p.ref}`} className="block font-semibold hover:text-brand">
                          {p.customers.full_name}
                        </Link>
                        <span className="text-[13px] text-stone-500">{localPhone(p.customers.phone)}</span>
                      </td>
                      <td className="px-3 py-4">{p.products.name}</td>
                      <td className="w-[210px] px-3 py-4">
                        <div className="flex flex-col gap-1.5">
                          <MonthBar
                            price={p.price}
                            paid={p.total_paid}
                            months={p.duration_months}
                            size="sm"
                            tone={p.status === "completed" || p.status === "collected" ? "green" : p.status === "active" ? "brand" : "stone"}
                          />
                          <span className="text-[13px]">
                            <b>{formatGHS(p.total_paid)}</b> <span className="text-stone-400">of {formatGHS(p.price)}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`block text-[13px] ${s.tone}`}>{s.label}</span>
                        <span className="text-[13px] text-stone-500">{s.sub}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right">
                        {p.status === "completed" ? (
                          <CollectButton p={p} />
                        ) : (
                          <Link href={`/admin/plans/${p.ref}`} className="text-sm font-semibold hover:text-brand">
                            Open
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
