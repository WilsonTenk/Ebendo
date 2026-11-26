import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Hero, type HeroExample } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { SHOP_CATEGORIES, listProducts, type Product } from "@/lib/catalog";
import { perMonth } from "@/lib/money";

export const dynamic = "force-dynamic";

const STEPS = [
  ["Pick your item", "Choose anything in the shop and how many months: 1 to 6."],
  ["Make a first payment", "Pay by MoMo or card, or cash at the shop. Your price is locked from today."],
  ["Pay small small", "Top up any amount, any time. We text your balance after every payment."],
  ["Collect it", "Fully paid? Bring your reference to our shop and take it home."],
] as const;

/** The hero's example plan: a fridge reads best, else the dearest appliance, else anything. */
function heroExample(all: Product[]): HeroExample | null {
  const inStock = all.filter((p) => p.stock_qty > 0);
  const pick =
    inStock.find((p) => /fridge/i.test(p.name)) ??
    inStock.filter((p) => p.category === "appliances").sort((a, b) => b.price - a.price)[0] ??
    inStock[0];
  if (!pick) return null;
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleString("en-GB", { month: "short" }),
  );
  return { name: pick.name, price: pick.price, monthly: perMonth(pick.price, 6), href: `/products/${pick.slug}`, months };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; all?: string }>;
}) {
  // Old links (/?category=…, /?q=…) now live on the Category & search page.
  const { category, q, all: seeAll } = await searchParams;
  if (category || q || seeAll) {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (q) p.set("q", q);
    redirect(`/shop${p.size ? `?${p}` : ""}`);
  }

  const all = await listProducts();
  const inStock = all.filter((p) => p.stock_qty > 0);
  const featured = SHOP_CATEGORIES.map((c) => inStock.find((p) => p.category === c.id)).filter(Boolean) as Product[];

  return (
    <main>
      <Hero example={heroExample(all)} />

      {/* Shop by category: a simple list on phones, four tiles on larger screens */}
      <section className="mx-auto max-w-7xl px-5 pb-8 md:px-8 xl:px-16 md:pb-16">
        <h2 className="text-[22px] font-extrabold tracking-tight md:text-[26px]">Shop by category</h2>
        <nav className="mt-2 flex flex-col md:hidden">
          {SHOP_CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.id}`}
              className="flex min-h-[52px] items-center justify-between border-b border-line text-base font-medium"
            >
              <span>{c.label}</span>
              <span className="text-sm text-stone-500">{all.filter((p) => p.category === c.id).length} →</span>
            </Link>
          ))}
        </nav>
        <div className="mt-5 hidden grid-cols-4 gap-5 md:grid">
          {SHOP_CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.id}`}
              className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-white p-4 transition hover:border-stone-300"
            >
              <span className="flex aspect-[4/3] items-center justify-center rounded-xl bg-tile">
                <CategoryIcon category={c.id} className="h-16 w-16 text-stone-400" />
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="text-[17px] font-semibold">{c.label}</span>
                <span className="shrink-0 text-sm text-stone-500">{all.filter((p) => p.category === c.id).length} items →</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* In the shop now */}
      <section id="shop" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-8 md:px-8 xl:px-16 md:pb-[72px]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-extrabold tracking-tight md:text-[26px]">In the shop now</h2>
          <Link href="/shop" className="text-sm font-semibold hover:text-brand md:text-[15px]">
            <span className="md:hidden">See all</span>
            <span className="hidden md:inline">See all products →</span>
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-3.5 gap-y-5 md:mt-5 md:grid-cols-4 md:gap-6">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-5 md:px-8 xl:px-16">
        <div className="rounded-2xl bg-ink px-5 py-6 text-white md:rounded-3xl md:p-12">
          <h2 className="text-[22px] font-extrabold tracking-tight md:text-[34px]">How small small works</h2>
          <ol className="mt-5 flex flex-col gap-4 md:mt-8 md:grid md:grid-cols-4 md:gap-8">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-3.5 md:flex-col md:gap-2.5 md:border-t md:border-white/15 md:pt-[18px]">
                <span className="w-5 shrink-0 font-display text-xl font-extrabold text-accent md:text-[28px]">{i + 1}</span>
                <span>
                  <span className="hidden text-[17px] font-semibold md:block">{title}</span>
                  <span className="text-[15px] leading-relaxed text-stone-300 md:mt-2.5 md:block">
                    <span className="font-semibold text-white md:hidden">{title}. </span>
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Visit the shop */}
      <section className="mx-auto grid max-w-7xl items-center gap-6 px-5 pt-8 md:grid-cols-2 md:gap-12 md:px-8 xl:px-16 md:pt-[72px]">
        <div className="hidden aspect-video items-center justify-center rounded-[20px] bg-tile text-stone-400 md:flex">
          <Icon name="store" className="h-16 w-16" />
        </div>
        <div className="flex flex-col gap-2 md:gap-3.5">
          <h2 className="text-[22px] font-extrabold tracking-tight md:text-[34px]">Visit the shop</h2>
          <p className="text-[15px] leading-relaxed text-stone-600 md:text-[17px]">
            See any item before you start a plan, and collect it here when it&apos;s paid. Behind Accra Brewery, Graphic
            Road, Accra.
          </p>
          <Link href="/contact" className="mt-1 text-[15px] font-semibold underline underline-offset-4 hover:text-brand md:text-base">
            Directions and opening hours →
          </Link>
        </div>
      </section>
    </main>
  );
}
