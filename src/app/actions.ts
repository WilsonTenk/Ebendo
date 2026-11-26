"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { rules, siteUrl } from "@/lib/config";
import { isDemo } from "@/lib/catalog";
import { cedisToPesewas, formatGHS } from "@/lib/money";
import { DEMO_PENDING_REF } from "@/lib/plan-data";
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
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);

const startSchema = z.object({
  productId: z.string().uuid(),
  slug: z.string(),
  fullName: z.string().trim().min(2, "Enter your full name"),
  phone: z.string(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email or leave it empty")]),
  months: z.coerce.number().int(),
});

/**
 * Start a plan, step 2 of 3 ("Your details"): save the customer and create the
 * plan, waiting for its first payment. Step 3 (/plan/[ref]/pay) takes the
 * first payment by MoMo, card or store credit. Unpaid plans are dropped after 48 hours.
 */
export async function startPlan(formData: FormData) {
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  const back = `/start/${formData.get("slug") ?? ""}?months=${encodeURIComponent(String(formData.get("months") ?? ""))}`;
  if (!parsed.success) fail(back, parsed.error!.issues[0].message);
  const f = parsed.data!;

  const phone = normalizeGhPhone(f.phone);
  if (!phone) fail(back, "Enter all 10 digits of a Ghana number, e.g. 024 000 0000");
  if (!(rules.durations as readonly number[]).includes(f.months)) fail(back, "Pick a plan length of 1 to 6 months");

  // Preview mode has no database: continue to a sample plan's first-payment step.
  if (isDemo) redirect(`/plan/${DEMO_PENDING_REF}/pay`);

  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("id, price, stock_qty, active")
    .eq("id", f.productId)
    .single();
  if (!product || !product.active) fail(back, "This product is no longer available");
  if (product!.stock_qty < 1) fail(back, "This product is out of stock");

  // Existing customers keep the name they first gave; we never overwrite it from a public form.
  const { data: existing } = await db.from("customers").select("id").eq("phone", phone!).maybeSingle();
  let customerId = existing?.id as string | undefined;
  if (!customerId) {
    const { data: created, error } = await db
      .from("customers")
      .insert({ full_name: f.fullName, phone: phone!, email: f.email || null })
      .select("id")
      .single();
    if (error) throw error;
    customerId = created.id;
  }

  const ref = newPlanRef();
  const { error: planErr } = await db.from("plans").insert({
    ref,
    customer_id: customerId,
    product_id: product!.id,
    price: product!.price,
    duration_months: f.months,
  });
  if (planErr) throw planErr;
  redirect(`/plan/${ref}/pay`);
}

/** Customer tops up an existing plan with any amount ("small small"). */
export async function payTowardsPlan(formData: FormData) {
  const ref = String(formData.get("ref") ?? "");
  // The first payment comes from step 3 of starting a plan; send errors back there.
  const back = formData.get("step") === "first" ? `/plan/${ref}/pay` : `/plan/${ref}`;
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
  if (!(amount >= min)) {
    fail(back, plan!.status === "pending_deposit" ? `The first payment must be at least ${formatGHS(min)}` : `The minimum payment is ${formatGHS(min)}`);
  }
  if (amount > owed) fail(back, `You only owe ${formatGHS(owed)}`);

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
