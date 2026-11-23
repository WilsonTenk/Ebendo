import { rules, siteUrl } from "@/lib/config";
import { formatGHS } from "@/lib/money";
import { balance, expectedPaidBy, type Plan } from "@/lib/plans";
import { sendSms } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Row = Plan & { customers: { full_name: string; phone: string }; products: { name: string } };

/**
 * Runs daily (see vercel.json). It:
 *  1. cancels plans whose deposit was never paid, and
 *  2. texts customers who are behind an even payment pace, or past their due date.
 * Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorised", { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();

  // 1. Expire unpaid plans.
  const cutoff = new Date(now.getTime() - rules.pendingExpiryHours * 3600_000).toISOString();
  const { count: cancelled } = await db
    .from("plans")
    .update({ status: "cancelled" }, { count: "exact" })
    .eq("status", "pending_deposit")
    .lt("created_at", cutoff);

  // 2. Remind customers who are behind.
  const remindBefore = new Date(now.getTime() - rules.reminderIntervalDays * 86400_000).toISOString();
  const { data: plans, error } = await db
    .from("plans")
    .select("*, customers(full_name, phone), products(name)")
    .eq("status", "active")
    .or(`last_reminded_at.is.null,last_reminded_at.lt.${remindBefore}`)
    .returns<Row[]>();
  if (error) throw error;

  let sent = 0;
  for (const plan of plans ?? []) {
    const behindBy = expectedPaidBy(plan, now) - plan.total_paid;
    const overdue = plan.due_date !== null && new Date(plan.due_date) < now;
    if (behindBy <= 0 && !overdue) continue;

    const firstName = plan.customers.full_name.split(" ")[0];
    const message = overdue
      ? `Hi ${firstName}, your Ebendo plan ${plan.ref} for ${plan.products.name} is past its due date. Balance: ${formatGHS(balance(plan))}. Pay here: ${siteUrl}/plan/${plan.ref}`
      : `Hi ${firstName}, a reminder from Ebendo: to stay on track with ${plan.products.name}, please pay about ${formatGHS(behindBy)}. Balance: ${formatGHS(balance(plan))}. Pay here: ${siteUrl}/plan/${plan.ref}`;

    const result = await sendSms(plan.customers.phone, message);
    await db.from("reminders").insert({
      plan_id: plan.id,
      channel: "sms",
      message,
      ok: result.ok,
      error: result.error ?? null,
    });
    if (result.ok) {
      await db.from("plans").update({ last_reminded_at: now.toISOString() }).eq("id", plan.id);
      sent++;
    }
  }

  return Response.json({ cancelled: cancelled ?? 0, checked: plans?.length ?? 0, sent });
}
