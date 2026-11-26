import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { shop } from "@/lib/config";

export const metadata: Metadata = {
  title: "Visit the shop",
  description: "Ebendo, behind Accra Brewery, Graphic Road, Accra. See any item before you start a plan, and collect it here when it's paid.",
};

const q = encodeURIComponent(shop.mapQuery);
const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
const MAP_EMBED = `https://maps.google.com/maps?q=${q}&z=16&output=embed`;
const TO_CONFIRM = "text-stone-400";

/** Visit the shop (UI board #11): photo + map, address, phone, hours, one "Get directions" button. */
export default function VisitTheShop() {
  const details: { label: string; value: React.ReactNode }[] = [
    {
      label: "Address",
      value: (
        <>
          {shop.address.join(", ")}
          <br />
          <span className="text-stone-500">GPS: {shop.gps}</span>
        </>
      ),
    },
    {
      label: "Call or WhatsApp",
      value: shop.phone ? (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="font-semibold underline underline-offset-4">
            {shop.phone}
          </a>
          {shop.whatsapp && (
            <a href={`https://wa.me/${shop.whatsapp}`} className="font-semibold underline underline-offset-4">
              WhatsApp us
            </a>
          )}
        </span>
      ) : (
        <span className={TO_CONFIRM}>[Shop phone number — to confirm]</span>
      ),
    },
    {
      label: "Opening hours",
      value: shop.hours ? (
        <span className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-0.5">
          {shop.hours.map(([days, time]) => (
            <span key={days} className="contents">
              <span>{days}</span>
              <span>{time}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className={TO_CONFIRM}>[Opening hours — to confirm]</span>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 pb-6 md:px-8 xl:px-16">
      <section className="flex flex-col gap-2.5 pt-7 md:pt-12">
        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-[52px]">Visit the shop</h1>
        <p className="text-base leading-normal text-stone-600 md:text-lg">
          See any item before you start a plan, and collect it here when it&apos;s paid.
        </p>
      </section>

      <section className="grid items-start gap-6 pt-5 md:grid-cols-[1.4fr_1fr] md:gap-12 md:pt-8">
        <div className="flex flex-col gap-2.5 md:gap-4">
          {/* Shop front photo: to come from the client */}
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl bg-tile text-stone-400 md:aspect-video md:rounded-[20px]">
            <Icon name="store" className="h-14 w-14" />
            <span className="text-[13px]">Photo of the shop front — coming soon</span>
          </div>
          <div className="h-40 overflow-hidden rounded-2xl bg-[#e9e3d8] md:h-[260px] md:rounded-[20px]">
            <iframe
              title="Map: Ebendo, behind Accra Brewery, Graphic Road, Accra"
              src={MAP_EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full border-0"
            />
          </div>
          <a
            href={DIRECTIONS}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[52px] items-center justify-center rounded-xl bg-ink font-semibold text-white hover:bg-stone-800 md:hidden"
          >
            Get directions
          </a>
        </div>

        <div className="flex flex-col gap-6">
          <dl className="flex flex-col">
            {details.map((d) => (
              <div key={d.label} className="flex flex-col gap-1 border-t border-line py-3.5 last:border-b md:py-4">
                <dt className="text-[13px] text-stone-500">{d.label}</dt>
                <dd className="text-[15px] leading-normal md:text-base">{d.value}</dd>
              </div>
            ))}
          </dl>
          <a
            href={DIRECTIONS}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-14 items-center justify-center rounded-xl bg-ink font-semibold text-white hover:bg-stone-800 md:flex"
          >
            Get directions
          </a>
          <Link href="/plan" className="text-[15px] font-semibold hover:text-brand">
            Already paying? Track my plan →
          </Link>
        </div>
      </section>
    </main>
  );
}
