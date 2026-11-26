import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";
import { CATEGORIES, SHOP_CATEGORIES, SORTS, categoryLabel, listProducts, type Sort } from "@/lib/catalog";

export const dynamic = "force-dynamic";

type Params = { category?: string; q?: string; sort?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { category, q } = await searchParams;
  if (q?.trim()) return { title: `Search: ${q.trim()}` };
  if (category && CATEGORIES.some((c) => c.id === category)) return { title: categoryLabel(category) };
  return { title: "Shop" };
}

/** Category & search (UI board #4): own listing layout, result count, sort, one row of category chips. */
export default async function ShopListing({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const category = CATEGORIES.some((c) => c.id === params.category) ? params.category : undefined;
  const search = params.q?.trim() || undefined;
  const sort: Sort = SORTS.some((s) => s.id === params.sort) ? (params.sort as Sort) : "price_asc";

  const [products, everything] = await Promise.all([listProducts({ category, search, sort }), listProducts()]);
  const count = (id?: string) => (id ? everything.filter((p) => p.category === id).length : everything.length);

  const title = search ? `“${search}”` : category ? categoryLabel(category) : "All products";
  const link = (id?: string) => {
    const p = new URLSearchParams();
    if (id) p.set("category", id);
    if (search) p.set("q", search);
    if (sort !== "price_asc") p.set("sort", sort);
    const qs = p.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };
  const navItems = [{ id: undefined, label: "All products", short: "All" }, ...SHOP_CATEGORIES];

  return (
    <main className="mx-auto max-w-7xl px-5 pb-10 md:px-8 xl:px-16">
      {/* Phone: search box at the top */}
      <form action="/shop" role="search" className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 lg:hidden">
        {category && <input type="hidden" name="category" value={category} />}
        <Icon name="search" className="h-[18px] w-[18px] shrink-0 text-stone-500" />
        <input
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Search fridges, TVs, phones…"
          aria-label="Search products"
          className="h-11 min-w-0 flex-1 bg-transparent text-base focus:outline-none"
        />
      </form>

      {/* Desktop: breadcrumb */}
      <nav aria-label="Breadcrumb" className="hidden gap-2 pt-7 text-sm text-stone-400 lg:flex">
        <Link href="/" className="text-stone-500 hover:text-brand">
          Shop
        </Link>
        <span>/</span>
        <span className="font-medium text-ink">{search ? "Search" : category ? categoryLabel(category) : "All products"}</span>
      </nav>

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12 lg:pt-7">
        {/* Desktop: category sidebar */}
        <aside className="hidden flex-col gap-6 lg:flex">
          <nav aria-label="Categories" className="flex flex-col gap-0.5">
            <p className="mb-2 ml-3 text-[13px] font-semibold uppercase tracking-wider text-stone-400">Categories</p>
            {navItems.map((c) => {
              const active = c.id === category;
              return (
                <Link
                  key={c.label}
                  href={link(c.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex justify-between rounded-[10px] px-3 py-2.5 text-[15px] ${
                    active ? "bg-ink font-semibold text-white" : "hover:bg-tile"
                  }`}
                >
                  <span>{c.label}</span>
                  <span className={active ? "text-stone-300" : "text-stone-400"}>{count(c.id)}</span>
                </Link>
              );
            })}
          </nav>
          <CantFindIt />
        </aside>

        <div>
          <div className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-end lg:justify-between lg:border-b lg:border-line lg:pb-5 lg:pt-0">
            <div>
              <h1 className="text-[32px] font-extrabold leading-tight tracking-tight lg:text-[40px]">{title}</h1>
              <p className="mt-1 text-sm text-stone-500 lg:text-[15px]">
                {products.length} {products.length === 1 ? "item" : "items"}
                {search && category && ` in ${categoryLabel(category)}`}
                <span className="hidden lg:inline"> · every price shows the 6-month amount</span>
              </p>
            </div>

            {/* Phone: one row of category chips */}
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] lg:hidden">
              {navItems.map((c) => {
                const active = c.id === category;
                return (
                  <Link
                    key={c.label}
                    href={link(c.id)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm ${
                      active ? "bg-ink font-semibold text-white" : "border border-stone-300"
                    }`}
                  >
                    {c.short}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3 lg:border-0 lg:pt-0">
              <SortSelect value={sort} className="w-full justify-between lg:w-auto" />
            </div>
          </div>

          {products.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center">
              <p className="font-display text-2xl font-extrabold">Nothing found</p>
              <p className="mx-auto mt-2 max-w-sm text-[15px] text-stone-600">
                {search ? `No items match “${search}”.` : "Nothing in this category right now."} We have more in the shop
                than we list online.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-4">
                <Link href="/shop" className="inline-flex h-12 items-center rounded-xl bg-ink px-6 font-semibold text-white">
                  See all products
                </Link>
                <Link href="/contact" className="inline-flex h-12 items-center font-semibold underline underline-offset-4">
                  Ask the shop
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-3.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-8">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
              {/* Phone: "Can't find it?" sits in the grid like a card */}
              <div className="lg:hidden">
                <CantFindIt square />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function CantFindIt({ square = false }: { square?: boolean }) {
  return (
    <div
      className={`flex flex-col justify-center gap-2 rounded-xl border border-dashed border-stone-300 p-4 ${
        square ? "aspect-square" : "rounded-[14px] p-[18px]"
      }`}
    >
      <span className="text-sm font-semibold lg:text-[15px]">Can&apos;t find it?</span>
      <span className="text-[13px] leading-snug text-stone-500 lg:text-sm">We have more in the shop than we list online.</span>
      <Link href="/contact" className="text-[13px] font-semibold hover:text-brand lg:text-sm">
        Ask us →
      </Link>
    </div>
  );
}
