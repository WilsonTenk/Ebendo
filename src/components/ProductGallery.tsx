"use client";

import { useRef, useState } from "react";
import { CategoryIcon } from "./CategoryIcon";

/**
 * Product photos (UI board: Product). Several photos of the same item —
 * front, side, inside, back. Tap a thumbnail to show it big; on phones you can
 * also swipe the big photo. Thumbnails sit below on phones and to the left on desktop.
 */
export function ProductGallery({ photos, name, category }: { photos: string[]; name: string; category: string }) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const count = photos.length;
  const go = (i: number) => setIndex((i + count) % count);

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-tile md:rounded-[20px]">
        <CategoryIcon category={category} className="h-32 w-32 text-stone-400 md:h-44 md:w-44" />
      </div>
    );
  }

  const main = (
    <div
      className="relative aspect-square touch-pan-y select-none overflow-hidden rounded-2xl bg-tile md:rounded-[20px]"
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null || count < 2) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
      role="group"
      aria-roledescription="photo gallery"
      aria-label={`${name}, photo ${index + 1} of ${count}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- product photos come from Supabase storage */}
      <img src={photos[index]} alt={`${name}, photo ${index + 1} of ${count}`} draggable={false} className="h-full w-full object-contain p-5" />
      {count > 1 && (
        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-stone-600 md:hidden">
          {index + 1} / {count}
        </span>
      )}
    </div>
  );

  if (count === 1) return main;

  return (
    <div
      className="flex flex-col gap-2.5 md:grid md:grid-cols-[88px_1fr] md:gap-3.5"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="order-2 grid grid-cols-4 gap-2 md:order-1 md:flex md:flex-col md:gap-2.5">
        {photos.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show photo ${i + 1} of ${count}`}
            aria-current={i === index}
            className={`aspect-square overflow-hidden rounded-[10px] bg-tile md:rounded-xl ${
              i === index ? "border-2 border-ink" : "border border-line opacity-80 hover:opacity-100"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnails of the same photos */}
            <img src={src} alt="" className="h-full w-full object-contain p-1.5" />
          </button>
        ))}
      </div>
      <div className="order-1 md:order-2">{main}</div>
    </div>
  );
}
