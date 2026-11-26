/** All amounts are integers in pesewas. */
export function formatGHS(pesewas: number): string {
  const whole = pesewas % 100 === 0;
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pesewas / 100);
}

/** Rough monthly amount for display, rounded up to a whole cedi. */
export function perMonth(pricePesewas: number, months: number): number {
  return Math.ceil(pricePesewas / months / 100) * 100;
}

/** Parse a cedi amount typed by a person ("150", "150.5") into pesewas. */
export function cedisToPesewas(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/,/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}
