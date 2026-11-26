"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Today & plans", short: "Plans" },
  { href: "/admin/products", label: "Products", short: "Products" },
];

/** Admin navigation: list in the sidebar (desktop), two tabs in the top bar (phone). */
export function AdminNav({ variant }: { variant: "side" | "top" }) {
  const path = usePathname();
  // Plan and customer pages belong to "Today & plans".
  const isActive = (href: string) => (href === "/admin" ? !path.startsWith("/admin/products") : path.startsWith(href));

  if (variant === "top") {
    return (
      <nav className="flex gap-1" aria-label="Admin">
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            className={`flex h-10 items-center rounded-[10px] px-3 text-sm font-semibold ${isActive(i.href) ? "bg-white text-ink" : "text-stone-300"}`}
          >
            {i.short}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={isActive(i.href) ? "page" : undefined}
          className={`flex h-11 items-center rounded-[10px] px-3.5 text-[15px] font-semibold ${
            isActive(i.href) ? "bg-white text-ink" : "text-stone-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
