import type { Metadata } from "next";
import { ErrorNote } from "@/components/ErrorNote";
import { login } from "../actions";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

const field = "h-[52px] rounded-xl border border-stone-300 bg-white px-3.5 text-base font-normal focus:border-ink focus:outline-none";

/** Admin login (UI board #12): simple and branded. */
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex flex-1 flex-col bg-ink md:grid md:grid-cols-2">
      {/* Brand side (phones: just the top strip) */}
      <section className="flex flex-col justify-between gap-6 px-6 pb-9 pt-16 text-white md:px-16 md:py-14">
        <p className="font-display text-[30px] font-extrabold tracking-tight md:text-[34px]">
          ebendo<span className="text-accent">.</span>{" "}
          <span className="font-sans text-[15px] font-medium tracking-normal text-stone-400 md:text-base">shop admin</span>
        </p>
        <div className="hidden flex-col gap-4 md:flex">
          <p className="font-display text-[44px] font-extrabold leading-[1.05] tracking-tight">
            Plans, pickups and stock
            <br />
            in one place.
          </p>
          <div className="flex w-[360px] gap-[5px]" aria-hidden>
            {[1, 1, 1, 1, 0, 0].map((on, i) => (
              <div key={i} className={`h-3 flex-1 rounded-[3px] ${on ? "bg-brand" : "bg-[#3a342f]"}`} />
            ))}
          </div>
        </div>
        <p className="hidden text-[13px] text-stone-500 md:block">For Ebendo staff only.</p>
      </section>

      <section className="flex flex-1 rounded-t-3xl bg-paper px-6 py-8 md:items-center md:justify-center md:rounded-none md:p-12">
        <form action={login} className="flex w-full flex-col gap-[18px] md:max-w-[400px] md:gap-5">
          <h1 className="text-[30px] font-extrabold tracking-tight md:text-[40px]">Log in</h1>
          <ErrorNote message={error} />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Staff email
            <input name="email" type="email" required autoComplete="username" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Password
            <input name="password" type="password" required autoComplete="current-password" className={field} />
          </label>
          <button className="h-[54px] rounded-xl bg-ink text-base font-semibold text-white hover:bg-stone-800 md:h-14">Log in</button>
          <p className="text-center text-sm text-stone-500">Forgot your password? Ask the shop owner to reset it.</p>
        </form>
      </section>
    </main>
  );
}
