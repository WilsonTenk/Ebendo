import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { formatGHS, perMonth } from "@/lib/money";
import { CategoryIcon } from "./CategoryIcon";

/**
 * Product photo on a plain warm tile (UI board: "Real product photos on plain
 * backgrounds"). Without a photo yet, a quiet category icon stands in.
 */
export function ProductImage({ product, iconClass = "h-16 w-16" }: { product: Pick<Product, "name" | "category" | "image_url">; iconClass?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-tile">
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- product photos come from Supabase storage
        <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-4" />
      ) : (
        <CategoryIcon category={product.category} className={`${iconClass} text-stone-400`} />
      )}
    </div>
  );
}

/** Card = photo, name, price, monthly. Nothing else (UI board #5). */
export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock_qty < 1;
  const fewLeft = !soldOut && product.stock_qty <= 2;
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-2">
      <div className="aspect-square overflow-hidden rounded-xl transition group-hover:opacity-90">
        <ProductImage product={product} />
      </div>
      <span className="mt-1 line-clamp-2 text-sm font-medium leading-snug md:text-[15px]">{product.name}</span>
      <span className="text-[15px] font-bold md:text-base">{formatGHS(product.price)}</span>
      {soldOut ? (
        <span className="text-[13px] font-semibold text-stone-500">Sold out</span>
      ) : (
        <span className="text-[13px] font-semibold text-brand md:text-sm">or {formatGHS(perMonth(product.price, 6))}/mo</span>
      )}
      {fewLeft && <span className="text-xs text-stone-500">Only {product.stock_qty} left</span>}
    </Link>
  );
}
