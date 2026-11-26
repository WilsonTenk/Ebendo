import crypto from "node:crypto";
import { cookies } from "next/headers";
import { isDemo } from "./catalog";
import { sendSms } from "./sms";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Customers have no password. Before they cancel a plan or spend store credit
 * we text a 6-digit code to their phone; entering it gives a short session
 * (a signed cookie) for that phone number.
 */

const COOKIE = "eb_phone";
const SESSION_MINUTES = 30;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_15_MIN = 3;

/** Preview mode only: this code always works, so the screens can be reviewed without SMS. */
export const DEMO_CODE = "123456";

function secret(): string {
  const s = process.env.CUSTOMER_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("CUSTOMER_SESSION_SECRET must be set (32+ characters)");
  return "dev-only-secret-not-for-production-use";
}

const hmac = (value: string) => crypto.createHmac("sha256", secret()).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// ------------------------------------------------------------ session

/** The phone number this browser has proved it owns, or null. */
export async function verifiedPhone(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(body))) return null;
  try {
    const { phone, exp } = JSON.parse(Buffer.from(body, "base64url").toString()) as { phone: string; exp: number };
    return Date.now() < exp ? phone : null;
  } catch {
    return null;
  }
}

async function startSession(phone: string) {
  const body = Buffer.from(JSON.stringify({ phone, exp: Date.now() + SESSION_MINUTES * 60_000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${hmac(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MINUTES * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/**
 * The number a code was just sent to (store credit page), kept in a private
 * cookie so it never appears in the address bar, history or server logs.
 */
const PENDING = "eb_pending_phone";

export async function setPendingPhone(phone: string) {
  (await cookies()).set(PENDING, phone, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CODE_MINUTES * 60,
  });
}

export async function pendingPhone(): Promise<string | null> {
  return (await cookies()).get(PENDING)?.value ?? null;
}

export async function clearPendingPhone() {
  (await cookies()).delete(PENDING);
}

// -------------------------------------------------------------- codes

/** Text a fresh code to `phone`. Returns an error sentence, or null when sent. */
export async function sendCode(phone: string): Promise<string | null> {
  if (isDemo) return null;
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await db
    .from("phone_codes")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_CODES_PER_15_MIN) return "Too many codes sent. Please wait 15 minutes and try again.";

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await db.from("phone_codes").insert({
    phone,
    code_hash: hmac(`${phone}:${code}`),
    expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
  });
  if (error) throw error;
  const sent = await sendSms(phone, `Ebendo: your code is ${code}. It expires in ${CODE_MINUTES} minutes. Don't share it with anyone.`);
  return sent.ok ? null : "We couldn't send the SMS. Please try again.";
}

/** Check a code for `phone`; on success start a session for that phone. */
export async function verifyCode(phone: string, input: string): Promise<boolean> {
  const code = input.replace(/\D/g, "");
  if (code.length !== 6) return false;
  if (isDemo) {
    if (code !== DEMO_CODE) return false;
    await startSession(phone);
    return true;
  }

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("phone_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("phone", phone)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row || new Date(row.expires_at) < new Date() || row.attempts >= MAX_ATTEMPTS) return false;

  if (!safeEqual(row.code_hash, hmac(`${phone}:${code}`))) {
    await db.from("phone_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return false;
  }
  // Single use: only the request that flips used_at wins.
  const { data: used } = await db
    .from("phone_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (!used?.length) return false;
  await startSession(phone);
  return true;
}

/** 024 ••• 0001 */
export function maskPhone(phone: string) {
  const local = phone.replace(/^\+233/, "0");
  return `${local.slice(0, 3)} ••• ${local.slice(-4)}`;
}
