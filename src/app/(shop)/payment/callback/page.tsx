import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StatusPanel } from "@/components/StatusPanel";
import { verifyTransaction } from "@/lib/paystack";
import { applyTransaction } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment not completed", robots: { index: false } };

/**
 * Paystack sends the customer here after checkout with ?reference=...
 * Paid → the Payment received screen. Anything else → "No money was taken".
 */
export default async function PaymentCallback({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; preview?: string }>;
}) {
  const { reference, preview } = await searchParams;

  // `?preview=failed` shows this screen without a real payment (design review only).
  let planRef: string | undefined = "EB-SAMPLE0001";
  if (preview !== "failed") {
    if (!reference) redirect("/");
    const tx = await verifyTransaction(reference);
    const plan = await applyTransaction(tx); // idempotent; the webhook may have done it already
    if (plan) redirect(`/plan/${plan.ref}/received`);
    planRef = tx.metadata?.plan_ref;
  }

  return (
    <StatusPanel
      icon="wallet"
      tone="warning"
      eyebrow="Payment not completed"
      title="No money was taken"
      body={
        <>
          The payment was cancelled or didn&apos;t go through, so nothing was added to your plan and nothing was charged. Your
          plan and its locked price are still safe — you can try again, or pay cash at the shop.
        </>
      }
      actions={[
        ...(planRef ? [{ label: "Try again", href: `/plan/${planRef}`, primary: true }] : []),
        { label: "Back to the shop", href: "/" },
      ]}
    />
  );
}
