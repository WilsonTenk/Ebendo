import { isValidSignature, verifyTransaction } from "@/lib/paystack";
import { applyTransaction } from "@/lib/plans";

/**
 * Paystack -> us. Set this URL in the Paystack dashboard:
 *   https://<your-domain>/api/paystack/webhook
 * This is the source of truth for payments; the callback page is only a fallback.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!isValidSignature(raw, req.headers.get("x-paystack-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw);
  if (event.event === "charge.success") {
    // Re-verify with Paystack rather than trusting the body's amount/status.
    const tx = await verifyTransaction(event.data.reference);
    await applyTransaction(tx);
  }
  return new Response("ok");
}
