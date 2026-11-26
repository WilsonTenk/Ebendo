import { Logo } from "@/components/Logo";
import { StatusPanel } from "@/components/StatusPanel";

/** 404 for URLs outside any section (shop pages use app/(shop)/not-found.tsx with the full header). */
export default function NotFound() {
  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <Logo />
        </div>
      </header>
      <StatusPanel
        icon="search"
        eyebrow="404"
        title="We couldn't find that page"
        body="The item may have sold out or the link may be wrong. Have a look around the shop instead."
        actions={[
          { label: "Back to the shop", href: "/", primary: true },
          { label: "Track my plan", href: "/plan" },
        ]}
      />
    </>
  );
}
