import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyTransaction } from "@/lib/paystack";
import { applyTransaction } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** Paystack sends the customer here after checkout with ?reference=... */
export default async function PaymentCallback({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  if (!reference) redirect("/");

  const tx = await verifyTransaction(reference);
  const plan = await applyTransaction(tx); // idempotent; the webhook may have done it already
  if (plan) redirect(`/plan/${plan.ref}?paid=1`);

  const planRef = tx.metadata?.plan_ref;
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Payment not completed</h1>
      <p className="mt-3 text-neutral-600">
        Paystack reported this payment as “{tx.status}”. No money was added to your plan.
      </p>
      {planRef && (
        <Link href={`/plan/${planRef}`} className="mt-6 inline-block rounded-lg bg-brand px-5 py-3 text-white">
          Back to my plan
        </Link>
      )}
    </main>
  );
}
