import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const valid = CATEGORIES.some((c) => c.id === category) ? category : undefined;
  const products = await listProducts(valid);

  return (
    <main>
      <section className="bg-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <h1 className="max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
            Get what you need. Pay small small.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">
            Fridges, TVs, phones, furniture and more. Spread the cost over 1 to 6 months with Mobile Money or card,
            and collect your item when it&apos;s fully paid.
          </p>
          <a href="#shop" className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-stone-900">
            Shop now
          </a>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold">How pay small small works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["Choose an item", "Pick what you want and a plan of 1 to 6 months."],
            ["Pay a deposit", "Start with a small first payment by MoMo or card. We set the item aside for you."],
            ["Pay any time", "Top up whenever you can. We text you your balance and friendly reminders."],
            ["Collect it", "Once it's fully paid, pick it up from our shop on Graphic Road."],
          ].map(([title, body], i) => (
            <li key={title} className="rounded-xl border border-stone-200 bg-white p-5">
              <span className="text-sm font-semibold text-brand">Step {i + 1}</span>
              <h3 className="mt-1 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-stone-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="shop" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/#shop"
            className={`rounded-full border px-4 py-1.5 text-sm ${!valid ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"}`}
          >
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/?category=${c.id}#shop`}
              className={`rounded-full border px-4 py-1.5 text-sm ${valid === c.id ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"}`}
            >
              {c.label}
            </Link>
          ))}
        </div>

        {products.length === 0 ? (
          <p className="mt-10 text-stone-500">No products here yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
