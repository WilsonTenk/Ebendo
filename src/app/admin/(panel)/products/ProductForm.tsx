import Link from "next/link";
import { ErrorNote } from "@/components/ErrorNote";
import { PhotoInput } from "@/components/PhotoInput";
import { CATEGORIES, MAX_PHOTOS, isDemo, productPhotos, type Product } from "@/lib/catalog";
import { formatGHS, perMonth } from "@/lib/money";
import { createProduct, makeMainPhoto, removePhoto, updateProduct } from "../../actions";

const field = "h-[52px] w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3.5 text-base font-normal focus:border-ink focus:outline-none";

/**
 * Add / edit product (UI board #14 · #23): details on the left, photos and a
 * shop preview on the right. Phones: one column, Save bar at the bottom.
 */
export function ProductForm({ product, error, saved }: { product: Product | null; error?: string; saved?: boolean }) {
  const photos = product ? productPhotos(product) : [];
  const formId = "product-form";

  return (
    <div className="flex flex-col gap-6 pb-24 md:gap-7 md:pb-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <nav className="text-sm text-stone-500">
            <Link href="/admin/products" className="hover:text-brand">
              Products
            </Link>{" "}
            / {product ? "Edit" : "Add"}
          </nav>
          <h1 className="text-[26px] font-extrabold tracking-tight md:text-[32px]">{product ? product.name : "Add a product"}</h1>
        </div>
        <div className="hidden gap-2.5 md:flex">
          <Link href="/admin/products" className="inline-flex h-12 items-center rounded-xl border border-stone-300 bg-white px-6 font-semibold">
            Cancel
          </Link>
          <button form={formId} disabled={isDemo} className="h-12 rounded-xl bg-ink px-6 font-semibold text-white hover:bg-stone-800 disabled:opacity-60">
            Save product
          </button>
        </div>
      </div>

      {saved && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          Saved. {product?.active ? "It's live in the shop." : "It's hidden from the shop."}
        </p>
      )}
      <ErrorNote message={error} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-7">
        <form id={formId} action={product ? updateProduct : createProduct} className="order-2 flex flex-col gap-[18px] rounded-[18px] border border-line bg-white p-5 md:p-6 lg:order-1">
          {product && <input type="hidden" name="id" value={product.id} />}
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Name
            <input name="name" required maxLength={120} defaultValue={product?.name} placeholder='e.g. Samsung 43" Smart TV' className={field} />
          </label>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Price (GH₵)
              <input name="price" required type="number" step="0.01" min="0.01" inputMode="decimal" defaultValue={product ? product.price / 100 : undefined} className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              In stock
              <input name="stock" required type="number" step="1" min="0" inputMode="numeric" defaultValue={product?.stock_qty ?? 1} className={field} />
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold md:col-span-1">
              Category
              <select name="category" defaultValue={product?.category ?? "appliances"} className={field}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Details
            <textarea
              name="description"
              rows={5}
              maxLength={2000}
              defaultValue={product?.description ?? ""}
              placeholder="Size, features, warranty…"
              className="w-full resize-y rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-base font-normal leading-normal focus:border-ink focus:outline-none"
            />
          </label>
          <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-line bg-paper px-4 text-[15px] font-medium">
            <span>
              Show in the shop
              <span className="block text-[13px] font-normal text-stone-500">Turn off to hide it without deleting</span>
            </span>
            <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-[22px] w-[22px] accent-ink" />
          </label>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold">
              {photos.length ? "Add more photos" : "Photos"}{" "}
              <span className="font-normal text-stone-500">· front, side, inside, back</span>
            </p>
            <PhotoInput room={MAX_PHOTOS - photos.length} />
          </div>
          {isDemo && <p className="text-xs text-stone-500">Saving is switched off in preview mode.</p>}
        </form>

        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <section className="rounded-[18px] border border-line bg-white p-5">
            <p className="mb-3 text-[15px] font-semibold">
              Photos <span className="font-normal text-stone-500">· first one shows in the shop</span>
            </p>
            {photos.length === 0 ? (
              <p className="text-sm text-stone-500">No photos yet. Add up to 4 with the form.</p>
            ) : (
              <ul className="grid grid-cols-4 gap-2">
                {photos.map((url, i) => (
                  <li key={url} className="flex flex-col items-center gap-1">
                    <div className={`relative aspect-square w-full overflow-hidden rounded-xl bg-tile ${i === 0 ? "border-2 border-ink" : "border border-line"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- product photo from storage */}
                      <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-contain p-1" />
                      {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink px-1.5 text-[10px] font-bold text-white">Main</span>}
                    </div>
                    {product && i > 0 && (
                      <form action={makeMainPhoto}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="photo" value={url} />
                        <button disabled={isDemo} className="text-[11px] font-semibold hover:text-brand disabled:opacity-50">
                          Make main
                        </button>
                      </form>
                    )}
                    {product && (
                      <form action={removePhoto}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="photo" value={url} />
                        <button disabled={isDemo} className="text-[11px] font-semibold text-red-700 hover:underline disabled:opacity-50">
                          Remove
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {product && (
            <section className="hidden flex-col gap-2 rounded-[18px] border border-line bg-white p-5 lg:flex">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-stone-400">How it shows in the shop</p>
              <p className="text-[15px] font-semibold">{product.name}</p>
              <p className="text-[15px]">
                <b>{formatGHS(product.price)}</b>{" "}
                <span className="font-semibold text-brand">· or {formatGHS(perMonth(product.price, 6))}/mo</span>
              </p>
              <Link href={`/products/${product.slug}`} target="_blank" className="text-sm font-semibold hover:text-brand">
                Open in the shop ↗
              </Link>
            </section>
          )}
        </div>
      </div>

      {/* Phones: Save bar always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2.5 border-t border-line bg-white px-5 pb-6 pt-3.5 md:hidden">
        <Link href="/admin/products" className="flex h-[54px] flex-1 items-center justify-center rounded-xl border border-stone-300 font-semibold">
          Cancel
        </Link>
        <button form={formId} disabled={isDemo} className="h-[54px] flex-[2] rounded-xl bg-ink font-semibold text-white disabled:opacity-60">
          Save product
        </button>
      </div>
    </div>
  );
}
