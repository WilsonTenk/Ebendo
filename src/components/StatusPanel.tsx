import Link from "next/link";
import { Icon, type IconName } from "./Icon";

/**
 * Centred message for dead ends (UI board #10): failed or abandoned payments
 * ("No money was taken"), 404 and similar. Same layout as Payment received.
 */
export function StatusPanel({
  icon,
  tone = "neutral",
  eyebrow,
  title,
  body,
  actions,
}: {
  icon: IconName;
  tone?: "neutral" | "warning";
  eyebrow?: string;
  title: string;
  body: React.ReactNode;
  actions: { label: string; href: string; primary?: boolean }[];
}) {
  return (
    <main className="mx-auto flex max-w-7xl justify-center px-5 pb-12 pt-12 md:px-8 md:pb-24 md:pt-16">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-3.5 text-center">
        <span
          className={`flex h-[72px] w-[72px] items-center justify-center rounded-full md:h-20 md:w-20 ${
            tone === "warning" ? "bg-brand-soft text-brand-dark" : "bg-tile text-ink"
          }`}
        >
          <Icon name={icon} className="h-9 w-9" />
        </span>
        {eyebrow && <p className="mt-2 text-[13px] font-semibold uppercase tracking-wider text-stone-500">{eyebrow}</p>}
        <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-tight md:text-5xl">{title}</h1>
        <div className="text-base leading-normal text-stone-600 md:text-[17px]">{body}</div>
        <div className="mt-5 flex w-full flex-col gap-2.5 md:w-auto md:flex-row md:gap-3">
          {actions.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={
                a.primary
                  ? "inline-flex h-[54px] items-center justify-center rounded-xl bg-ink px-7 font-semibold text-white hover:bg-stone-800"
                  : "inline-flex h-12 items-center justify-center rounded-xl px-7 font-semibold md:h-[54px] md:border md:border-stone-300 md:bg-white"
              }
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
