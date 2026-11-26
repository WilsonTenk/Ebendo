import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProductImage } from "@/components/ProductCard";
import { CATEGORIES, categoryLabel, isDemo, listAllProducts } from "@/lib/catalog";
import { formatGHS } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products" };

/** Products manager (UI board #14): clean list with search + filter; editing happens on its own screen. */
export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q, category } = await searchParams;
  const all = await listAllProducts();
  const search = q?.trim().toLowerCase();
  const cat = CATEGORIES.some((c) => c.id === category) ? category : undefined;
  const products = all.filter((p) => (!cat || p.category === cat) && (!search || p.name.toLowerCase().includes(search)));
  const soldOut = all.filter((p) => p.stock_qty === 0).length;
  const hidden = all.filter((p) => !p.active).length;

  return (
    <div className="flex flex-col gap-5 pb-20 md:gap-7 md:pb-0">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight md:text-4xl">Products</h1>
          <p className="mt-1 text-sm text-stone-500">
            {all.length} products · {soldOut} sold out · {hidden} hidden{isDemo && " · sample data"}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="hidden h-12 items-center rounded-xl bg-ink px-6 font-semibold text-white hover:bg-stone-800 md:inline-flex"
        >
          + Add product
        </Link>
      </div>

      <section className="flex flex-col gap-4 md:rounded-[18px] md:border md:border-line md:bg-white md:p-5 md:pb-2">
        <form action="/admin/products" className="flex gap-2.5 md:gap-3">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 text-stone-500 md:h-11">
            <Icon name="search" className="h-[18px] w-[18px]" />
            <span className="sr-only">Search products</span>
            <input name="q" type="search" defaultValue={q} placeholder="Search products" className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none md:text-[15px]" />
          </label>
          <label className="hidden md:block">
            <span className="sr-only">Category</span>
            <select name="category" defaultValue={cat ?? ""} className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button className="hidden h-11 rounded-xl border border-ink px-4 text-sm font-semibold md:block">Filter</button>
        </form>

        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center text-stone-500 md:mb-3">
            No products match.{" "}
            <Link href="/admin/products" className="font-semibold text-ink underline">
              Show all
            </Link>
          </p>
        ) : (
          <>
            {/* Phones: simple rows */}
            <ul className="overflow-hidden rounded-2xl border border-line bg-white md:hidden">
              {products.map((p) => (
                <li key={p.id} className="border-b border-line last:border-0">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[10px]">
                      <ProductImage product={p} iconClass="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                      <span className={`text-[13px] ${p.stock_qty === 0 ? "font-medium text-red-700" : "text-stone-500"}`}>
                        {formatGHS(p.price)} · {p.stock_qty === 0 ? "Sold out" : `${p.stock_qty} in stock`}
                        {!p.active && " · Hidden"}
                      </span>
                    </span>
                    <span aria-hidden className="text-stone-400">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Computers: table */}
            <table className="hidden w-full border-collapse text-sm md:table">
              <thead>
                <tr className="text-left text-[13px] text-stone-400">
                  <th className="w-16 px-3 py-2.5" />
                  <th className="px-3 py-2.5 font-semibold">Name</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 font-semibold">Price</th>
                  <th className="px-3 py-2.5 font-semibold">In stock</th>
                  <th className="px-3 py-2.5 font-semibold">In the shop</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-line align-middle">
                    <td className="px-3 py-3">
                      <span className="block h-12 w-12 overflow-hidden rounded-[10px]">
                        <ProductImage product={p} iconClass="h-6 w-6" />
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <Link href={`/admin/products/${p.id}`} className="hover:text-brand">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-stone-500">{categoryLabel(p.category)}</td>
                    <td className="px-3 py-3">{formatGHS(p.price)}</td>
                    <td className="px-3 py-3">{p.stock_qty === 0 ? <span className="font-semibold text-red-700">Sold out</span> : p.stock_qty}</td>
                    <td className="px-3 py-3">{p.active ? "Shown" : <span className="text-stone-400">Hidden</span>}</td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-brand">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* Phones: floating Add button */}
      <Link
        href="/admin/products/new"
        className="fixed bottom-6 right-5 z-20 flex h-14 items-center gap-2 rounded-full bg-ink px-[22px] text-base font-semibold text-white shadow-[0_6px_20px_rgba(26,23,20,0.25)] md:hidden"
      >
        <span aria-hidden className="text-[22px] leading-none">
          +
        </span>{" "}
        Add product
      </Link>
    </div>
  );
}
