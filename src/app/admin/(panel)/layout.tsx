import type { Metadata } from "next";
import Link from "next/link";
import { isDemo } from "@/lib/catalog";
import { supabaseAuth } from "@/lib/supabase/server";
import { logout } from "../actions";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { robots: { index: false } };

function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <Link href="/admin" className={`font-display font-extrabold text-white ${small ? "text-xl" : "text-2xl"}`}>
      ebendo<span className="text-accent">.</span>{" "}
      <span className="font-sans text-[13px] font-medium text-stone-400">admin</span>
    </Link>
  );
}

/** Admin frame (UI board: Admin): dark sidebar on computers, dark top bar with tabs on phones. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let email: string | null = null;
  if (!isDemo) {
    const { data } = await (await supabaseAuth()).auth.getUser();
    email = data.user?.email ?? null;
  }

  return (
    <div className="flex min-h-screen flex-1 bg-paper">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-7 bg-ink px-4 py-6 md:flex">
        <div className="px-2">
          <Wordmark />
        </div>
        <AdminNav variant="side" />
        <div className="mt-auto flex flex-col gap-1.5 border-t border-white/10 px-2 pt-3 text-[13px] text-stone-400">
          <span className="truncate">{email ?? (isDemo ? "Preview mode" : "")}</span>
          <Link href="/" target="_blank" className="text-stone-300 hover:text-white">
            View the shop ↗
          </Link>
          <form action={logout}>
            <button className="font-semibold text-stone-200 hover:text-white">Log out</button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 bg-ink py-3 pl-5 pr-4 md:hidden">
          <Wordmark small />
          <AdminNav variant="top" />
        </div>
        <main className="w-full flex-1 px-5 py-6 md:px-12 md:py-8">{children}</main>
      </div>
    </div>
  );
}
