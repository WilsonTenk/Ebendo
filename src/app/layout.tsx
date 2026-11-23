import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Ebendo — Pay small small", template: "%s · Ebendo" },
  description:
    "Home appliances, electronics, furniture and phones in Accra. Pay small small over 1 to 6 months, collect when fully paid.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} min-h-screen font-sans antialiased flex flex-col`}>
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="text-xl font-bold text-brand">
              Ebendo
            </Link>
            <div className="flex items-center gap-5 text-sm">
              <Link href="/#how-it-works" className="hover:text-brand">How it works</Link>
              <Link href="/plan" className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark">
                Track my plan
              </Link>
            </div>
          </nav>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-stone-500">
            <p className="font-medium text-stone-700">Ebendo Blessing Supply Enterprise</p>
            <p>Behind Accra Brewery, Graphic Road, Accra</p>
            <p className="mt-2">© {new Date().getFullYear()} Ebendo. Items are released after full payment.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
