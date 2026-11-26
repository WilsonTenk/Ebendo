"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORTS, type Sort } from "@/lib/catalog";

/** Sort dropdown that updates the address straight away (no extra button). */
export function SortSelect({ value, className = "" }: { value: Sort; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className={`flex items-center gap-2.5 text-sm text-stone-500 ${className}`}>
      Sort
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("sort", e.target.value);
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        className="h-11 rounded-[10px] border border-stone-300 bg-white px-3 text-sm font-semibold text-ink"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
