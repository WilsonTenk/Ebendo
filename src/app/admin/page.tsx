import type { Metadata } from "next";
import Link from "next/link";
import { formatGHS } from "@/lib/money";
import { balance, type Plan } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { markCollected } from "./actions";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Plans", robots: { index: false } };

type Row = Plan & { customers: { full_name: string; phone: string }; products: { name: string } };

const FILTERS = [
  { id: "active", label: "Paying" },
  { id: "completed", label: "Ready for pickup" },
  { id: "pending_deposit", label: "Awaiting deposit" },
  { id: "collected", label: "Collected" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export default async function AdminPlans({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "active" } = await searchParams;
  const db = supabaseAdmin();

  const [{ data: plans }, { data: totals }] = await Promise.all([
    db
      .from("plans")
      .select("*, customers(full_name, phone), products(name)")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Row[]>(),
    db.from("plans").select("status, price, total_paid").in("status", ["active", "completed"]),
  ]);

  const outstanding = (totals ?? [])
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + (p.price - p.total_paid), 0);
  const readyCount = (totals ?? []).filter((p) => p.status === "completed").length;
  const activeCount = (totals ?? []).filter((p) => p.status === "active").length;
  const today = new Date();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav current="plans" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Customers paying" value={String(activeCount)} />
        <Stat label="Still to be paid" value={formatGHS(outstanding)} />
        <Stat label="Ready for pickup" value={String(readyCount)} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/admin?status=${f.id}`}
            className={`rounded-full border px-4 py-1.5 text-sm ${status === f.id ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr>
              {["Ref", "Customer", "Item", "Paid / Price", "Balance", "Due", ""].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(plans ?? []).map((p) => {
              const overdue = p.status === "active" && p.due_date && new Date(p.due_date) < today;
              return (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/plan/${p.ref}`} className="hover:text-brand" target="_blank">{p.ref}</Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.customers.full_name}
                    <div className="text-xs text-stone-500">{p.customers.phone}</div>
                  </td>
                  <td className="px-4 py-3">{p.products.name}</td>
                  <td className="px-4 py-3">{formatGHS(p.total_paid)} / {formatGHS(p.price)}</td>
                  <td className="px-4 py-3 font-medium">{formatGHS(balance(p))}</td>
                  <td className={`px-4 py-3 ${overdue ? "font-medium text-red-600" : ""}`}>
                    {p.due_date ?? "—"}
                    {overdue && " (overdue)"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "completed" && (
                      <form action={markCollected}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="rounded-lg bg-brand px-3 py-1.5 text-white hover:bg-brand-dark">
                          Mark collected
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {(plans ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">No plans here.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
