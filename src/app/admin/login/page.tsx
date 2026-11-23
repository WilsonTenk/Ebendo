import type { Metadata } from "next";
import { ErrorNote } from "@/components/ErrorNote";
import { login } from "../actions";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const input = "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand focus:outline-none";
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Shop admin</h1>
      <form action={login} className="mt-6 space-y-4">
        <ErrorNote message={error} />
        <label className="block text-sm">
          Email
          <input name="email" type="email" required autoComplete="username" className={input} />
        </label>
        <label className="block text-sm">
          Password
          <input name="password" type="password" required autoComplete="current-password" className={input} />
        </label>
        <button className="w-full rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
          Log in
        </button>
      </form>
    </main>
  );
}
