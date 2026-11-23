import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startPlan } from "@/app/actions";
import { ErrorNote } from "@/components/ErrorNote";
import { categoryLabel, getProduct } from "@/lib/catalog";
import { rules } from "@/lib/config";
import { formatGHS } from "@/lib/money";
import { minDeposit } from "@/lib/plans";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product?.name ?? "Product" };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, { error }] = await Promise.all([params, searchParams]);
  const product = await getProduct(slug);
  if (!product) notFound();

  const min = minDeposit(product.price);
  const inStock = product.stock_qty > 0;
  const input = "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand focus:outline-none";

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-xl bg-stone-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-400">No photo</div>
        )}
      </div>

      <div>
        <p className="text-sm text-stone-500">{categoryLabel(product.category)}</p>
        <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
        <p className="mt-3 text-2xl font-semibold">{formatGHS(product.price)}</p>
        {product.description && <p className="mt-4 whitespace-pre-line text-stone-700">{product.description}</p>}

        <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">About per month</th>
              </tr>
            </thead>
            <tbody>
              {rules.durations.map((m) => (
                <tr key={m} className="border-t border-stone-100">
                  <td className="px-4 py-2">{m} {m === 1 ? "month" : "months"}</td>
                  <td className="px-4 py-2">{formatGHS(Math.ceil(product.price / m))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {inStock ? (
          <form action={startPlan} className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Start paying small small</h2>
            <ErrorNote message={error} />
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="slug" value={product.slug} />
            <label className="block text-sm">
              Full name
              <input name="fullName" required autoComplete="name" className={input} />
            </label>
            <label className="block text-sm">
              Phone number (we text your receipts and reminders here)
              <input name="phone" required type="tel" autoComplete="tel" placeholder="024 000 0000" className={input} />
            </label>
            <label className="block text-sm">
              Email <span className="text-stone-400">(optional)</span>
              <input name="email" type="email" autoComplete="email" className={input} />
            </label>
            <label className="block text-sm">
              Plan length
              <select name="months" defaultValue={3} className={input}>
                {rules.durations.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 1 ? "month" : "months"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              First payment (GHS) — at least {formatGHS(min)}
              <input
                name="deposit"
                required
                type="number"
                inputMode="decimal"
                step="0.01"
                min={min / 100}
                max={product.price / 100}
                defaultValue={min / 100}
                className={input}
              />
            </label>
            <button className="w-full rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
              Pay with Mobile Money or card
            </button>
            <p className="text-xs text-stone-500">
              You collect the item from our shop once it&apos;s fully paid. Payments are processed securely by Paystack.
            </p>
          </form>
        ) : (
          <p className="mt-8 rounded-lg bg-stone-100 px-4 py-3 text-stone-600">
            This item is out of stock right now. Please check back soon.
          </p>
        )}
      </div>
    </main>
  );
}
