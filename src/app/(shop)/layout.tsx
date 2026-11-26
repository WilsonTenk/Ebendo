import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { SHOP_CATEGORIES } from "@/lib/catalog";

/** Header and footer for every shop page (UI board: "Home · desktop" header, dark footer). */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3.5 md:gap-9 md:px-8 xl:px-16 md:py-4">
          <Logo className="h-7 md:h-8" />
          <nav aria-label="Categories" className="hidden items-center gap-7 text-[15px] font-medium lg:flex">
            {SHOP_CATEGORIES.map((c) => (
              <Link key={c.id} href={`/shop?category=${c.id}`} className="py-1.5 hover:text-brand">
                {c.short}
              </Link>
            ))}
          </nav>
          <form action="/shop" role="search" className="ml-auto hidden w-72 items-center gap-2.5 rounded-xl border border-line bg-white px-4 md:flex">
            <Icon name="search" className="h-[18px] w-[18px] shrink-0 text-stone-400" />
            <input
              name="q"
              type="search"
              placeholder="Search the shop"
              aria-label="Search the shop"
              className="h-11 min-w-0 flex-1 bg-transparent text-sm placeholder:text-stone-400 focus:outline-none"
            />
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link href="/shop" aria-label="Search" className="flex h-11 w-11 items-center justify-center md:hidden">
              <Icon name="search" className="h-[22px] w-[22px]" />
            </Link>
            <Link href="/plan" className="px-1 py-2.5 text-[15px] font-semibold hover:text-brand">
              My plan
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mt-20 bg-ink text-stone-400">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 md:px-8 xl:px-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Logo light className="h-7" />
            <p className="max-w-xs text-sm leading-relaxed">
              Pay small small for fridges, TVs, phones and furniture. Collect from our shop when it&apos;s paid.
            </p>
          </div>
          <FooterColumn
            title="Shop"
            links={SHOP_CATEGORIES.map((c) => ({ label: c.label, href: `/shop?category=${c.id}` }))}
          />
          <FooterColumn
            title="Help"
            links={[
              { label: "Track my plan", href: "/plan" },
              { label: "My store credit", href: "/credit" },
              { label: "How it works", href: "/#how" },
              { label: "Visit the shop", href: "/contact" },
            ]}
          />
          <FooterColumn
            title="Visit"
            links={[
              { label: "Behind Accra Brewery, Graphic Road, Accra", href: "/contact" },
              { label: "Directions and opening hours", href: "/contact" },
            ]}
          />
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs md:flex-row md:justify-between md:px-8 xl:px-16">
            <p>© {new Date().getFullYear()} Ebendo Blessing Supply Enterprise</p>
            <p>MTN MoMo · Telecel Cash · AirtelTigo · Visa · Mastercard — secured by Paystack</p>
          </div>
        </div>
      </footer>
    </>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="text-sm">
      <p className="font-semibold text-white">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
