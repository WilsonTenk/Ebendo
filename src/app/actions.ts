"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { rules, siteUrl } from "@/lib/config";
import { cedisToPesewas } from "@/lib/money";
import { initializeTransaction } from "@/lib/paystack";
import {
  balance,
  minDeposit,
  newPaymentRef,
  newPlanRef,
  normalizeGhPhone,
  paystackEmail,
  type Plan,
} from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";

const fail = (path: string, msg: string): never =>
  redirect(`${path}?error=${encodeURIComponent(msg)}`);

const startSchema = z.object({
  productId: z.string().uuid(),
  slug: z.string(),
  fullName: z.string().trim().min(2, "Enter your full name"),
  phone: z.string(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email or leave it empty")]),
  months: z.coerce.number().int(),
  deposit: z.string(),
});

/** Customer picks a product, a plan length and a first payment, then goes to Paystack. */
export async function startPlan(formData: FormData) {
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  const back = `/products/${formData.get("slug") ?? ""}`;
  if (!parsed.success) fail(back, parsed.error!.issues[0].message);
  const f = parsed.data!;

  const phone = normalizeGhPhone(f.phone);
  if (!phone) fail(back, "Enter a valid Ghana phone number");
  if (!(rules.durations as readonly number[]).includes(f.months)) fail(back, "Pick a plan length of 1 to 6 months");

  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("id, price, stock_qty, active")
    .eq("id", f.productId)
    .single();
  if (!product || !product.active) fail(back, "This product is no longer available");
  if (product!.stock_qty < 1) fail(back, "This product is out of stock");

  const deposit = cedisToPesewas(f.deposit);
  const min = minDeposit(product!.price);
  if (!(deposit >= min)) fail(back, `The first payment must be at least GHS ${(min / 100).toFixed(2)}`);
  if (deposit > product!.price) fail(back, "The first payment is more than the price");

  const { data: customer, error: custErr } = await db
    .from("customers")
    .upsert({ full_name: f.fullName, phone: phone!, email: f.email || null }, { onConflict: "phone" })
    .select("id, email")
    .single();
  if (custErr) throw custErr;

  const ref = newPlanRef();
  const { error: planErr } = await db.from("plans").insert({
    ref,
    customer_id: customer.id,
    product_id: product!.id,
    price: product!.price,
    duration_months: f.months,
  });
  if (planErr) throw planErr;

  const checkout = await initializeTransaction({
    email: paystackEmail(customer.email, phone!),
    amount: deposit,
    reference: newPaymentRef(ref),
    callbackUrl: `${siteUrl}/payment/callback`,
    planRef: ref,
  });
  redirect(checkout.authorization_url);
}

/** Customer tops up an existing plan with any amount ("small small"). */
export async function payTowardsPlan(formData: FormData) {
  const ref = String(formData.get("ref") ?? "");
  const back = `/plan/${ref}`;
  const db = supabaseAdmin();
  const { data: plan } = await db
    .from("plans")
    .select("*, customers(phone, email)")
    .eq("ref", ref)
    .single<Plan & { customers: { phone: string; email: string | null } }>();
  if (!plan) fail("/plan", "Plan not found");
  if (!["pending_deposit", "active"].includes(plan!.status)) fail(back, "This plan is not accepting payments");

  const amount = cedisToPesewas(String(formData.get("amount") ?? ""));
  const owed = balance(plan!);
  const min = plan!.status === "pending_deposit" ? minDeposit(plan!.price) : Math.min(rules.minPayment, owed);
  if (!(amount >= min)) fail(back, `The minimum payment is GHS ${(min / 100).toFixed(2)}`);
  if (amount > owed) fail(back, `You only owe GHS ${(owed / 100).toFixed(2)}`);

  const checkout = await initializeTransaction({
    email: paystackEmail(plan!.customers.email, plan!.customers.phone),
    amount,
    reference: newPaymentRef(ref),
    callbackUrl: `${siteUrl}/payment/callback`,
    planRef: ref,
  });
  redirect(checkout.authorization_url);
}

/** Look up a plan by its reference from the "Track my plan" form. */
export async function findPlan(formData: FormData) {
  const ref = String(formData.get("ref") ?? "").trim().toUpperCase();
  if (!/^EB-[A-Z0-9]{10}$/.test(ref)) fail("/plan", "Enter the plan reference from your SMS, e.g. EB-7KQ2M9XH4P");
  redirect(`/plan/${ref}`);
}
