import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonthPicker } from "@/components/MonthPicker";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { categoryLabel, getProduct, productPhotos, relatedProducts } from "@/lib/catalog";
import { rules } from "@/lib/config";
import { formatGHS } from "@/lib/money";
import { minDeposit } from "@/lib/plans";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product?.name ?? "Not found" };
}

const GOOD_TO_KNOW = [
  "Your price is locked from your first payment.",
  "Top up any amount, any time, by MoMo, card or cash at the shop.",
  "We text you a receipt and your balance every time.",
];

/** Product (UI board #6): photo, price, plan box with ONE main action, details below. */
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = await relatedProducts(product);
  const inStock = product.stock_qty > 0;

  return (
    <main className="mx-auto max-w-7xl px-5 md:px-8 xl:px-16">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 pt-5 text-sm text-stone-400 md:pt-7">
        <Link href="/shop" className="text-stone-500 hover:text-brand">
          Shop
        </Link>
        <span>/</span>
        <Link href={`/shop?category=${product.category}`} className="text-stone-500 hover:text-brand">
          {categoryLabel(product.category)}
        </Link>
        <span className="hidden md:inline">/</span>
        <span className="hidden font-medium text-ink md:inline">{product.name}</span>
      </nav>

      <section className="grid items-start gap-6 pb-10 pt-4 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pb-16 md:pt-6">
        {/* Photos: several sides of the same item */}
        <div className="md:sticky md:top-24">
          <ProductGallery photos={productPhotos(product)} name={product.name} category={product.category} />
        </div>

        <div className="flex flex-col gap-5 md:gap-[22px]">
          <div className="flex flex-col gap-1.5 md:gap-2">
            <h1 className="text-[30px] font-extrabold leading-[1.08] tracking-tight md:text-[44px] md:leading-[1.05]">
              {product.name}
            </h1>
            <p className="mt-1.5 text-[26px] font-bold md:text-[30px]">{formatGHS(product.price)}</p>
            {inStock ? (
              <p className="text-sm font-medium text-green-700 md:text-[15px]">
                In stock{product.stock_qty <= 2 && ` · ${product.stock_qty} left in the shop`}
              </p>
            ) : (
              <p className="text-sm font-medium text-red-700 md:text-[15px]">Sold out right now</p>
            )}
          </div>

          {inStock ? (
            <MonthPicker slug={product.slug} price={product.price} minFirst={minDeposit(product.price)} durations={rules.durations} />
          ) : (
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-semibold">This item is sold out</p>
              <p className="mt-1 text-[15px] text-stone-600">
                We may have more in the shop, or a similar item.{" "}
                <Link href="/contact" className="font-semibold underline underline-offset-4">
                  Ask us
                </Link>
                .
              </p>
            </div>
          )}

          <ul className="hidden flex-col gap-2.5 text-[15px] text-stone-600 md:flex">
            {GOOD_TO_KNOW.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="font-bold text-brand">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {product.description && (
        <section className="grid gap-3 pb-7 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pb-16">
          <div className="flex flex-col gap-2.5 md:gap-3">
            <h2 className="text-xl font-extrabold md:text-2xl">Details</h2>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-stone-600 md:text-base">{product.description}</p>
          </div>
        </section>
      )}

      {/* Phone: "Good to know" sits below the details, quietly */}
      <section className="pb-7 md:hidden">
        <h2 className="text-xl font-extrabold">Good to know</h2>
        <ul className="mt-2.5 flex list-disc flex-col gap-2 pl-[18px] text-[15px] leading-snug text-stone-600">
          {GOOD_TO_KNOW.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="pb-4">
          <h2 className="text-xl font-extrabold md:text-2xl">You may also like</h2>
          <div className="mt-3.5 grid grid-cols-2 gap-3.5 md:mt-5 md:grid-cols-4 md:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
