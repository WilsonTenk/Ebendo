import crypto from "node:crypto";

const API = "https://api.paystack.co";

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export type PaystackTransaction = {
  reference: string;
  status: string; // "success" | "failed" | "abandoned" | ...
  amount: number; // pesewas
  currency: string;
  channel: string;
  metadata?: { plan_ref?: string } | null;
};

/** Start a checkout. Returns the URL to send the customer to (MoMo + card). */
export async function initializeTransaction(args: {
  email: string;
  amount: number; // pesewas
  reference: string;
  callbackUrl: string;
  planRef: string;
}): Promise<{ authorization_url: string; reference: string }> {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: args.email,
      amount: args.amount,
      currency: "GHS",
      reference: args.reference,
      callback_url: args.callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: { plan_ref: args.planRef },
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(`Paystack initialize failed: ${json.message ?? res.status}`);
  return json.data;
}

export async function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(`Paystack verify failed: ${json.message ?? res.status}`);
  return json.data;
}

/** Paystack signs webhook bodies with HMAC-SHA512 using the secret key. */
export function isValidSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
