import Link from "next/link";
import { logout } from "./actions";

export function AdminNav({ current }: { current: "plans" | "products" }) {
  const tab = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm ${active ? "bg-brand text-white" : "hover:bg-stone-100"}`;
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex gap-2">
        <Link href="/admin" className={tab(current === "plans")}>Plans</Link>
        <Link href="/admin/products" className={tab(current === "products")}>Products</Link>
      </div>
      <form action={logout}>
        <button className="text-sm text-stone-500 hover:text-stone-900">Log out</button>
      </form>
    </div>
  );
}
