/**
 * The "small small" bar: one segment per month of the plan, filled as money
 * comes in. Optional month labels start from the plan's first payment.
 */
export function MonthBar({
  price,
  paid,
  months,
  start,
  size = "md",
  tone = "brand",
}: {
  price: number;
  paid: number;
  months: number;
  start?: string | null;
  size?: "sm" | "md";
  tone?: "brand" | "green" | "stone";
}) {
  const per = price / months;
  const fill = { brand: "bg-brand", green: "bg-green-600", stone: "bg-stone-400" }[tone];
  const startDate = start ? new Date(start) : null;
  return (
    <div
      className={`flex ${size === "sm" ? "gap-0.5" : "gap-1"}`}
      role="img"
      aria-label={`${Math.min(Math.floor(paid / per), months)} of ${months} months paid`}
    >
      {Array.from({ length: months }, (_, i) => {
        const pct = Math.min(Math.max((paid - i * per) / per, 0), 1) * 100;
        const label = startDate
          ? new Date(startDate.getFullYear(), startDate.getMonth() + i, 1).toLocaleString("en-GB", { month: "short" })
          : null;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className={`w-full overflow-hidden rounded-[3px] bg-stone-200 ${size === "sm" ? "h-2" : "h-3"}`}>
              <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
            </div>
            {label && size === "md" && (
              <span className={`text-[11px] font-medium ${pct > 0 ? "text-stone-700" : "text-stone-400"}`}>{label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
