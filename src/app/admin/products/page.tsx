import type { Metadata } from "next";
import { ErrorNote } from "@/components/ErrorNote";
import { CATEGORIES, categoryLabel, type Product } from "@/lib/catalog";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createProduct, updateProduct } from "../actions";
import { AdminNav } from "../AdminNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products", robots: { index: false } };

const input = "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand focus:outline-none";

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const { data: products } = await supabaseAdmin()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Product[]>();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav current="products" />

      <form action={createProduct} className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 md:grid-cols-2">
        <h2 className="text-lg font-semibold md:col-span-2">Add a product</h2>
        <div className="md:col-span-2">
          <ErrorNote message={error} />
          {saved && <p className="text-sm text-green-700">Product added.</p>}
        </div>
        <label className="block text-sm">
          Name
          <input name="name" required className={input} />
        </label>
        <label className="block text-sm">
          Category
          <select name="category" className={input}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Price (GHS)
          <input name="price" required type="number" step="0.01" min="0.01" className={input} />
        </label>
        <label className="block text-sm">
          Quantity in stock
          <input name="stock" required type="number" step="1" min="0" defaultValue={1} className={input} />
        </label>
        <label className="block text-sm md:col-span-2">
          Description
          <textarea name="description" rows={3} className={input} />
        </label>
        <label className="block text-sm md:col-span-2">
          Photo
          <input name="image" type="file" accept="image/*" capture="environment" className="mt-1 block text-sm" />
        </label>
        <button className="rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark md:col-span-2">
          Add product
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold">All products ({products?.length ?? 0})</h2>
      <div className="mt-4 space-y-3">
        {(products ?? []).map((p) => (
          <form
            key={p.id}
            action={updateProduct}
            className="grid items-end gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-[64px_1fr_120px_100px_auto_auto_auto]"
          >
            <input type="hidden" name="id" value={p.id} />
            <div className="h-16 w-16 overflow-hidden rounded-lg bg-stone-100">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-stone-500">{categoryLabel(p.category)}</p>
            </div>
            <label className="text-xs text-stone-500">
              Price (GHS)
              <input name="price" type="number" step="0.01" min="0.01" defaultValue={p.price / 100} className={input} />
            </label>
            <label className="text-xs text-stone-500">
              Stock
              <input name="stock" type="number" step="1" min="0" defaultValue={p.stock_qty} className={input} />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input name="active" type="checkbox" defaultChecked={p.active} /> On sale
            </label>
            <label className="pb-2 text-xs text-stone-500">
              New photo
              <input name="image" type="file" accept="image/*" className="block w-40 text-xs" />
            </label>
            <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50">Save</button>
          </form>
        ))}
      </div>
    </main>
  );
}
