"use server";

import { redirect } from "next/navigation";
import { isDemo } from "@/lib/catalog";
import { rules, siteUrl } from "@/lib/config";
import {
  clearPendingPhone,
  endSession,
  pendingPhone,
  sendCode,
  setPendingPhone,
  verifiedPhone,
  verifyCode,
} from "@/lib/customer-auth";
import { cedisToPesewas, formatGHS } from "@/lib/money";
import { creditBalance, getPlanDetail } from "@/lib/plan-data";
import {
  balance,
  isOpen,
  minDeposit,
  moneyError,
  normalizeGhPhone,
  receiptMessage,
  textCustomer,
  type Plan,
  type RecordResult,
} from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";

const go = (path: string, params: Record<string, string>): never =>
  redirect(`${path}?${new URLSearchParams(params).toString()}`);

/** Only allow redirects back into our own customer pages. */
function safeNext(raw: FormDataEntryValue | null, fallback: string) {
  const next = String(raw ?? "");
  return /^\/(plan\/EB-[A-Z0-9]{10}(\/cancel|\/pay)?|credit)$/.test(next) ? next : fallback;
}

// ------------------------------------------------------------ codes

/** Text a code to the phone on a plan (used before cancelling or spending credit on it). */
export async function sendPlanCode(formData: FormData) {
  const ref = String(formData.get("ref") ?? "");
  const next = safeNext(formData.get("next"), `/plan/${ref}`);
  const plan = await getPlanDetail(ref);
  if (!plan) redirect("/plan");
  const error = await sendCode(plan!.customers.phone);
  if (error) go(next, { error });
  go(next, { sent: "1" });
}

/** Store credit page: text a code to the phone number the customer typed. */
export async function sendCreditCode(formData: FormData) {
  const phone = normalizeGhPhone(String(formData.get("phone") ?? ""));
  if (!phone) go("/credit", { error: "Enter the phone number you used for your plans, e.g. 024 000 0000" });
  // Same reply whether or not we know the number, so the form can't be used to look people up.
  const error = await sendCode(phone!);
  if (error) go("/credit", { error });
  await setPendingPhone(phone!);
  go("/credit", { sent: "1" });
}

/**
 * Check a code and start a short session for that phone. The phone comes from
 * the plan (plan pages) or the private pending cookie (store credit page),
 * never from the form, so nobody can aim a code check at someone else's number.
 */
export async function confirmCode(formData: FormData) {
  const next = safeNext(formData.get("next"), "/credit");
  const ref = String(formData.get("ref") ?? "");
  const phone = ref ? ((await getPlanDetail(ref))?.customers.phone ?? null) : await pendingPhone();
  if (!phone) redirect(next);
  const ok = await verifyCode(phone!, String(formData.get("code") ?? ""));
  if (!ok) go(next, { sent: "1", error: "That code is wrong or has expired. Check the SMS, or ask for a new code." });
  if (!ref) await clearPendingPhone();
  redirect(next);
}

export async function signOutCustomer() {
  await endSession();
  redirect("/credit");
}

// ------------------------------------------------------------ cancel

/**
 * Customer stops paying: the item goes back on sale and 100% of what they
 * paid becomes store credit. Requires a verified phone. No cash refunds.
 */
export async function cancelPlanByCustomer(formData: FormData) {
  const ref = String(formData.get("ref") ?? "");
  const path = `/plan/${ref}/cancel`;
  const plan = await getPlanDetail(ref);
  if (!plan) redirect("/plan");
  if (!isOpen(plan!)) redirect(`/plan/${ref}`);
  if ((await verifiedPhone()) !== plan!.customers.phone) go(path, { error: "Please confirm with the SMS code first." });
  if (isDemo) go(path, { error: "Cancelling is switched off in preview mode." });

  const { data, error } = await supabaseAdmin().rpc("end_plan", {
    p_plan_id: plan!.id,
    p_reason: "cancelled_by_customer",
    p_by: null,
  });
  if (error) throw error;
  const ended = (data as { ended: boolean; plan: Plan }).plan;
  if (ended.credited_amount > 0) {
    await textCustomer(
      ended,
      `Ebendo: you cancelled plan ${ref}. The item is back on sale and the ${formatGHS(ended.credited_amount)} you paid is now your store credit. Use it on any item: ${siteUrl}/credit`,
    );
  }
  go("/credit", { ended: ref });
}

// ------------------------------------------------------- spend credit

/** Pay towards a plan from the customer's own store credit. Requires a verified phone. */
export async function payWithCredit(formData: FormData) {
  const ref = String(formData.get("ref") ?? "");
  // Step 3 of starting a plan sends errors back to itself; My plan sends them back to the plan page.
  const path = formData.get("step") === "first" ? `/plan/${ref}/pay` : `/plan/${ref}`;
  const plan = await getPlanDetail(ref);
  if (!plan) redirect("/plan");
  if (!isOpen(plan!)) go(`/plan/${ref}`, { error: "This plan is not taking payments" });
  if ((await verifiedPhone()) !== plan!.customers.phone) go(path, { credit: "1", error: "Please confirm with the SMS code first." });

  const amount = cedisToPesewas(String(formData.get("amount") ?? ""));
  const owed = balance(plan!);
  const credit = await creditBalance(plan!.customer_id);
  const first = plan!.status === "pending_deposit";
  const min = first ? minDeposit(plan!.price) : Math.min(rules.minPayment, owed);
  if (!(amount > 0) || amount > Math.min(credit, owed)) {
    go(path, { credit: "1", error: `You can use up to ${formatGHS(Math.min(credit, owed))} of credit on this plan.` });
  }
  if (amount < min) {
    go(path, {
      credit: "1",
      error: first
        ? `The first payment must be at least ${formatGHS(min)}. Pay the first payment by MoMo or card, then use your credit.`
        : `The minimum payment is ${formatGHS(min)}.`,
    });
  }
  if (isDemo) go(path, { credit: "1", error: "Payments are switched off in preview mode." });

  const { data, error } = await supabaseAdmin().rpc("spend_credit", { p_plan_ref: ref, p_amount: amount, p_by: null });
  if (error) go(path, { credit: "1", error: moneyError(error) });
  await textCustomer((data as RecordResult).plan, receiptMessage(data as RecordResult, amount, "from your store credit"));
  redirect(`/plan/${ref}/received`);
}

// ------------------------------------------------------ lost reference

/**
 * "Lost your reference?" (Track my plan): text the customer their plan
 * references. Same reply whatever happens, so nobody can use it to find out
 * who has a plan. At most one such SMS per phone every 15 minutes.
 */
export async function textMyReferences(formData: FormData) {
  const phone = normalizeGhPhone(String(formData.get("phone") ?? ""));
  if (!phone) go("/plan", { error: "Enter the phone number you used, e.g. 024 000 0000" });
  if (isDemo) go("/plan", { texted: "1" });

  const db = supabaseAdmin();
  const { data: customer } = await db.from("customers").select("id").eq("phone", phone!).maybeSingle();
  if (customer) {
    const { data: plans } = await db
      .from("plans")
      .select("id, ref, status, products(name)")
      .eq("customer_id", customer.id)
      .in("status", ["pending_deposit", "active", "completed"])
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<{ id: string; ref: string; status: string; products: { name: string } }[]>();
    if (plans?.length) {
      const since = new Date(Date.now() - 15 * 60_000).toISOString();
      const { count } = await db
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .in("plan_id", plans.map((p) => p.id))
        .like("message", "Ebendo: your plan reference%")
        .gte("sent_at", since);
      if (!count) {
        const list = plans.map((p) => `${p.ref} (${p.products.name})`).join(", ");
        const message = `Ebendo: your plan reference${plans.length > 1 ? "s are" : " is"} ${list}. Track or pay: ${siteUrl}/plan`;
        await textCustomer({ id: plans[0].id, customer_id: customer.id }, message);
      }
    }
  }
  go("/plan", { texted: "1" });
}
