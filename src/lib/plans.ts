import crypto from "node:crypto";
import { rules, siteUrl } from "./config";
import { formatGHS } from "./money";
import type { PaystackTransaction } from "./paystack";
import { sendSms } from "./sms";
import { supabaseAdmin } from "./supabase/admin";

export type Plan = {
  id: string;
  ref: string;
  customer_id: string;
  product_id: string;
  price: number;
  total_paid: number;
  duration_months: number;
  status: "pending_deposit" | "active" | "completed" | "collected" | "cancelled" | "defaulted";
  activated_at: string | null;
  due_date: string | null;
  completed_at: string | null;
  collected_at: string | null;
  last_reminded_at: string | null;
  created_at: string;
  ended_at: string | null;
  ended_reason: "no_deposit" | "cancelled_by_customer" | "cancelled_by_staff" | "expired" | null;
  credited_amount: number;
};

/** Plans that can still take money. */
export const isOpen = (p: Pick<Plan, "status">) => p.status === "pending_deposit" || p.status === "active";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function randomCode(len: number) {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Public plan reference, e.g. EB-7KQ2M9XH4P. Long enough to be unguessable. */
export const newPlanRef = () => `EB-${randomCode(10)}`;

/** Unique Paystack reference for one payment on a plan. */
export const newPaymentRef = (planRef: string) => `${planRef}-${randomCode(6)}`;

/** Normalise Ghana numbers to +233XXXXXXXXX. Returns null if it doesn't look valid. */
export function normalizeGhPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local: string | null = null;
  if (digits.length === 10 && digits.startsWith("0")) local = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith("233")) local = digits.slice(3);
  else if (digits.length === 9) local = digits;
  return local && /^[235]\d{8}$/.test(local) ? `+233${local}` : null;
}

export function paystackEmail(email: string | null | undefined, phone: string) {
  return email || `${phone.replace(/\D/g, "")}@${rules.placeholderEmailDomain}`;
}

export const balance = (p: Pick<Plan, "price" | "total_paid">) => Math.max(p.price - p.total_paid, 0);

export function minDeposit(price: number) {
  return Math.max(Math.ceil(price * rules.minDepositFraction), Math.min(rules.minPayment, price));
}

/**
 * How much the customer should have paid by `now` if they spread payments
 * evenly over the plan. Used to decide who gets a reminder.
 */
export function expectedPaidBy(plan: Plan, now = new Date()): number {
  if (!plan.activated_at || !plan.due_date) return 0;
  const start = new Date(plan.activated_at).getTime();
  const end = new Date(plan.due_date).getTime();
  const frac = Math.min(Math.max((now.getTime() - start) / (end - start), 0), 1);
  return Math.ceil(plan.price * frac);
}

export type RecordResult = { inserted: boolean; plan: Plan; credited: number; receipt_no?: string | null };

/** Text the customer and keep a copy in the reminders log. Never throws. */
export async function textCustomer(plan: Pick<Plan, "id" | "customer_id">, message: string) {
  const db = supabaseAdmin();
  const { data: c } = await db.from("customers").select("phone").eq("id", plan.customer_id).single();
  if (!c) return;
  const result = await sendSms(c.phone, message);
  await db.from("reminders").insert({ plan_id: plan.id, channel: "sms", message, ok: result.ok, error: result.error ?? null });
}

/** The SMS receipt for any payment: online, cash at the shop, or store credit. */
export function receiptMessage(r: RecordResult, amount: number, how: string): string {
  const { plan, credited } = r;
  if (credited > 0 && credited === amount) {
    return `Ebendo: we received ${formatGHS(amount)} ${how}, but plan ${plan.ref} had already ended, so it is now store credit. Use it on any item: ${siteUrl}/credit`;
  }
  const extra = credited > 0 ? ` The extra ${formatGHS(credited)} is now your store credit.` : "";
  const left = balance(plan);
  return left === 0
    ? `Ebendo: we received ${formatGHS(amount - credited)} ${how}. Plan ${plan.ref} is fully paid. Come to the shop on Graphic Road to collect your item.${extra} Thank you!`
    : `Ebendo: we received ${formatGHS(amount)} ${how} for plan ${plan.ref}. Paid: ${formatGHS(plan.total_paid)}. Balance: ${formatGHS(left)}. Track or pay: ${siteUrl}/plan/${plan.ref}${extra}`;
}

/** Map a database error from the money functions to a sentence a person can read. */
export function moneyError(e: { message?: string } | null | undefined, fallback = "Something went wrong. Nothing was charged."): string {
  const m = e?.message ?? "";
  for (const known of ["Not enough store credit", "That is more than the balance on this plan", "This plan is not accepting payments", "Amount must be more than zero"]) {
    if (m.includes(known)) return known;
  }
  return fallback;
}

/**
 * Apply a verified, successful Paystack transaction to its plan (idempotent:
 * the webhook and the callback page may both call this for one payment).
 * Texts the customer a receipt the first time a payment is recorded.
 */
export async function applyTransaction(tx: PaystackTransaction): Promise<Plan | null> {
  if (tx.status !== "success" || tx.currency !== "GHS") return null;
  const planRef = tx.metadata?.plan_ref;
  if (!planRef) return null;
  const { data, error } = await supabaseAdmin().rpc("record_payment", {
    p_reference: tx.reference,
    p_plan_ref: planRef,
    p_amount: tx.amount,
    p_channel: tx.channel,
    p_raw: tx,
  });
  if (error) throw error;
  const result = data as RecordResult;
  if (result.inserted) await textCustomer(result.plan, receiptMessage(result, tx.amount, "by " + (tx.channel === "card" ? "card" : "Mobile Money")));
  return result.plan;
}
