import type { Metadata } from "next";
import { findPlan } from "@/app/actions";
import { ErrorNote } from "@/components/ErrorNote";

export const metadata: Metadata = { title: "Track my plan" };

export default async function PlanLookup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Track my plan</h1>
      <p className="mt-2 text-stone-600">Enter the plan reference from your SMS receipt.</p>
      <form action={findPlan} className="mt-6 space-y-4">
        <ErrorNote message={error} />
        <input
          name="ref"
          required
          placeholder="EB-7KQ2M9XH4P"
          className="w-full rounded-lg border border-stone-300 px-3 py-3 uppercase tracking-wider focus:border-brand focus:outline-none"
        />
        <button className="w-full rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
          Find my plan
        </button>
      </form>
    </main>
  );
}
