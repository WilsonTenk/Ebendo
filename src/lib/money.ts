/** All amounts are integers in pesewas. */
export function formatGHS(pesewas: number): string {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(pesewas / 100);
}

/** Parse a cedi amount typed by a person ("150", "150.5") into pesewas. */
export function cedisToPesewas(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/,/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}
