import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS: use only in server code
 * (route handlers, server components, server actions), never in the browser.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not set (see .env.example)");
  return createClient(url, key, { auth: { persistSession: false } });
}
