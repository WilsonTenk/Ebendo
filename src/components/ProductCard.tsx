import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { formatGHS } from "@/lib/money";

export function ProductCard({ product }: { product: Product }) {
  const perMonth = Math.ceil(product.price / 6);
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:shadow-md"
    >
      <div className="aspect-square bg-stone-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-400">No photo</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium group-hover:text-brand">{product.name}</h3>
        <p className="mt-1 text-lg font-semibold">{formatGHS(product.price)}</p>
        <p className="text-sm text-stone-500">or from {formatGHS(perMonth)}/month</p>
        {product.stock_qty < 1 && <p className="mt-1 text-sm font-medium text-red-600">Out of stock</p>}
      </div>
    </Link>
  );
}
