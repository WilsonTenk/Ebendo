import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { isDemo } from "@/lib/catalog";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: { default: "Ebendo — Pay small small", template: "%s · Ebendo" },
  description:
    "Home appliances, electronics, furniture and phones in Accra. Pay small small over 1 to 6 months, collect when fully paid.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable}`}>
      <body className={`flex min-h-screen flex-col font-sans antialiased`}>
        {isDemo && (
          <div className="bg-amber-100 px-4 py-1 text-center text-xs text-amber-900">
            Preview mode — showing sample data
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
