import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatGHS } from "@/lib/money";
import { creditEntries, customerPlans, getCustomer } from "@/lib/plan-data";
import { STATUS_LABEL, fmtDate, localPhone } from "@/lib/plan-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  const [plans, entries] = await Promise.all([customerPlans(id), creditEntries(id)]);
  const credit = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <nav className="text-sm text-stone-500">
        <Link href="/admin" className="hover:text-brand">
          Today &amp; plans
        </Link>{" "}
        / {customer.full_name}
      </nav>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">{customer.full_name}</h1>
        <span className="text-stone-500">
          {localPhone(customer.phone)} · customer since {fmtDate(customer.created_at)}
        </span>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200 md:p-6">
            <h2 className="text-lg font-bold">Plans</h2>
            <ul className="mt-2 divide-y divide-stone-100">
              {plans.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/plans/${p.ref}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand">
                    <span className="min-w-0">
                      <span className="block font-semibold">{p.products.name}</span>
                      <span className="text-xs text-stone-500">
                        {p.ref} · {formatGHS(p.total_paid)} of {formatGHS(p.price)}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_LABEL[p.status].tone}`}>
                      {STATUS_LABEL[p.status].label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200 md:p-6">
            <h2 className="text-lg font-bold">Store credit history</h2>
            {entries.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">No store credit yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100">
                {entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{e.note ?? e.kind}</span>
                      <span className="text-xs text-stone-500">
                        {fmtDate(e.created_at)}
                        {e.created_by && ` · by ${e.created_by.split("@")[0]}`}
                      </span>
                    </span>
                    <b className={e.amount > 0 ? "text-violet-700" : "text-stone-700"}>
                      {e.amount > 0 ? "+" : "−"}
                      {formatGHS(Math.abs(e.amount))}
                    </b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Store credit</p>
          <p className={`mt-2 text-4xl font-black tracking-tight ${credit > 0 ? "text-violet-700" : ""}`}>{formatGHS(credit)}</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Usable on any item: as the first payment of a new plan, or towards an open plan (use the “Use credit” box on the
            plan). Never paid out in cash.
          </p>
          <p className="mt-3 rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
            New plan at the counter: the customer starts it on their phone, then you apply the credit or record cash on the
            plan.
          </p>
        </aside>
      </div>
    </>
  );
}
