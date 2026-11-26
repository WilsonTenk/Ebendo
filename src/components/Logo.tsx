import Link from "next/link";

/**
 * The Ebendo wordmark ("ebendo." in Bricolage Grotesque ExtraBold), from the
 * outlined SVGs in public/brand. `light` uses the reversed version for dark backgrounds.
 */
export function Logo({
  light = false,
  href = "/",
  className = "h-8",
}: {
  light?: boolean;
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className="flex shrink-0 items-center" aria-label="Ebendo home">
      {/* eslint-disable-next-line @next/next/no-img-element -- a tiny static SVG; next/image adds nothing here */}
      <img
        src={light ? "/brand/ebendo-logo-reversed.svg" : "/brand/ebendo-logo-primary.svg"}
        alt="Ebendo"
        className={`${className} w-auto`}
      />
    </Link>
  );
}
