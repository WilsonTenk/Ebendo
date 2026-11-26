import type { Plan } from "./plans";

/** How each plan status reads to staff, with its badge colours. */
export const STATUS_LABEL: Record<Plan["status"], { label: string; tone: string }> = {
  pending_deposit: { label: "No first payment", tone: "bg-amber-100 text-amber-800" },
  active: { label: "Paying", tone: "bg-orange-100 text-brand-dark" },
  completed: { label: "Fully paid · ready", tone: "bg-green-100 text-green-800" },
  collected: { label: "Collected", tone: "bg-stone-200 text-stone-600" },
  cancelled: { label: "Cancelled", tone: "bg-violet-100 text-violet-800" },
  defaulted: { label: "Ended unpaid", tone: "bg-violet-100 text-violet-800" },
};

/** Why a plan ended, in plain words. */
export const ENDED_REASON: Record<NonNullable<Plan["ended_reason"]>, string> = {
  no_deposit: "No first payment within 48 hours",
  cancelled_by_customer: "Cancelled by the customer",
  cancelled_by_staff: "Cancelled at the shop",
  expired: "End date passed before it was fully paid",
};

export const localPhone = (phone: string) => phone.replace(/^\+233/, "0");

export const fmtDate = (d: string, style: "medium" | "long" = "medium") =>
  new Date(d).toLocaleDateString("en-GH", { dateStyle: style });

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
