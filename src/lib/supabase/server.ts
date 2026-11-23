import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdminEmail } from "../admin-emails";

/** Cookie-based client used only for admin login sessions. */
export async function supabaseAuth() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a server component; middleware refreshes the session instead.
          }
        },
      },
    },
  );
}

export { isAdminEmail };

/** Throws unless the current session belongs to an admin. Use in server actions. */
export async function requireAdmin() {
  const supabase = await supabaseAuth();
  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) throw new Error("Not authorised");
  return data.user!;
}
