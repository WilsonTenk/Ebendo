import { rules, siteUrl } from "@/lib/config";
import { formatGHS } from "@/lib/money";
import { balance, expectedPaidBy, type Plan } from "@/lib/plans";
import { sendSms } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Row = Plan & { customers: { full_name: string; phone: string }; products: { name: string } };

const DAY = 86_400_000;
/** Ghana is on UTC all year, so UTC dates are shop dates. */
const dayString = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Runs daily at 09:00 (see vercel.json). It:
 *  1. drops plans whose first payment never came (48 hours);
 *  2. ends plans whose end date has passed before they were fully paid:
 *     the item goes back into stock and 100% of what was paid becomes
 *     store credit (client rule: no cash refunds);
 *  3. warns customers 7 days and 1 day before their end date;
 *  4. reminds customers who are behind an even payment pace (at most weekly).
 * Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorised", { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();
  const today = dayString(now);

  async function text(plan: Row, message: string) {
    const result = await sendSms(plan.customers.phone, message);
    await db.from("reminders").insert({ plan_id: plan.id, channel: "sms", message, ok: result.ok, error: result.error ?? null });
    return result.ok;
  }

  // 1. Drop plans with no first payment (nothing paid, nothing reserved).
  const cutoff = new Date(now.getTime() - rules.pendingExpiryHours * 3600_000).toISOString();
  const { count: dropped } = await db
    .from("plans")
    .update({ status: "cancelled", ended_reason: "no_deposit", ended_at: now.toISOString() }, { count: "exact" })
    .eq("status", "pending_deposit")
    .lt("created_at", cutoff);

  // 2. End plans whose end date has passed.
  const { data: expired, error: expErr } = await db
    .from("plans")
    .select("*, customers(full_name, phone), products(name)")
    .eq("status", "active")
    .lt("due_date", today)
    .returns<Row[]>();
  if (expErr) throw expErr;
  let ended = 0;
  for (const plan of expired ?? []) {
    const { data, error } = await db.rpc("end_plan", { p_plan_id: plan.id, p_reason: "expired", p_by: null });
    if (error) {
      console.error(`end_plan failed for ${plan.ref}`, error);
      continue;
    }
    const result = data as { ended: boolean; plan: Plan };
    if (!result.ended) continue;
    ended++;
    await text(
      plan,
      `Ebendo: plan ${plan.ref} for ${plan.products.name} reached its end date before it was fully paid, so the item is back on sale. The ${formatGHS(result.plan.credited_amount)} you paid is now your store credit. Use it on any item: ${siteUrl}/credit`,
    );
  }

  // 3 + 4. Warnings before the end date, and catch-up reminders.
  const { data: plans, error } = await db
    .from("plans")
    .select("*, customers(full_name, phone), products(name)")
    .eq("status", "active")
    .returns<Row[]>();
  if (error) throw error;

  const remindBefore = now.getTime() - rules.reminderIntervalDays * DAY;
  const in7 = dayString(new Date(now.getTime() + 7 * DAY));
  const in1 = dayString(new Date(now.getTime() + 1 * DAY));
  let warned = 0;
  let reminded = 0;

  for (const plan of plans ?? []) {
    const firstName = plan.customers.full_name.split(" ")[0];
    const left = formatGHS(balance(plan));
    const link = `${siteUrl}/plan/${plan.ref}`;
    let message: string | null = null;

    if (plan.due_date === in7 || plan.due_date === in1) {
      const when = plan.due_date === in1 ? "tomorrow" : "in 7 days";
      message = `Hi ${firstName}, your Ebendo plan for ${plan.products.name} ends ${when} (${plan.due_date}). Balance: ${left}. If it isn't fully paid by then, the item goes back on sale and what you paid becomes store credit. Pay here: ${link}`;
      if (await text(plan, message)) warned++;
    } else {
      const behindBy = expectedPaidBy(plan, now) - plan.total_paid;
      const recentlyReminded = plan.last_reminded_at && new Date(plan.last_reminded_at).getTime() > remindBefore;
      if (behindBy <= 0 || recentlyReminded) continue;
      message = `Hi ${firstName}, a reminder from Ebendo: to stay on track with ${plan.products.name}, please pay about ${formatGHS(behindBy)}. Balance: ${left}. Pay here or with cash at the shop: ${link}`;
      if (await text(plan, message)) reminded++;
    }
    await db.from("plans").update({ last_reminded_at: now.toISOString() }).eq("id", plan.id);
  }

  return Response.json({ dropped: dropped ?? 0, ended, warned, reminded, checked: plans?.length ?? 0 });
}
