import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin-emails";

/** Guards /admin: refreshes the Supabase session and requires an ADMIN_EMAILS login. */
export async function middleware(req: NextRequest) {
  // Local design preview: no Supabase configured and not a production build -> show admin with sample data.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return new NextResponse("Admin is not configured", { status: 503 });
  }

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  if (req.nextUrl.pathname !== "/admin/login" && !isAdminEmail(data.user?.email)) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return res;
}

export const config = { matcher: ["/admin/:path*"] };
