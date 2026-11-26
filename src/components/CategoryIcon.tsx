/** Simple line icons per category, used for tiles and for products without a photo. */
export function CategoryIcon({ category, className = "h-8 w-8" }: { category: string; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };
  switch (category) {
    case "electronics":
      return (
        <svg {...common}>
          <rect x="2.5" y="4" width="19" height="12.5" rx="1.5" />
          <path d="M8 20h8M12 16.5V20" />
        </svg>
      );
    case "appliances":
      return (
        <svg {...common}>
          <rect x="5.5" y="2.5" width="13" height="19" rx="1.5" />
          <path d="M5.5 9.5h13M8.5 5.5v2M8.5 12.5v3" />
        </svg>
      );
    case "phones":
      return (
        <svg {...common}>
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M11 18.5h2" />
        </svg>
      );
    case "furniture":
      return (
        <svg {...common}>
          <path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
          <path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3v-4ZM5 17v2M19 17v2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
          <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
        </svg>
      );
  }
}
