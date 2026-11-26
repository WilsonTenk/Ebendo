"use client";

import { useState } from "react";

const MAX_SIDE = 1600; // px, longest side
const QUALITY = 0.82;

/** Shrink a phone photo in the browser so uploads stay small and fast. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/**
 * Photo picker for admin product forms: several photos at once (camera or
 * gallery), shrunk before upload, with small previews. Submits as "photos".
 */
export function PhotoInput({ room, label = "Add photos" }: { room: number; label?: string }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (room <= 0) return <p className="text-xs text-stone-500">4 photos already — remove one to add another.</p>;

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm font-medium text-stone-600 hover:border-brand hover:text-brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        {busy ? "Preparing photos…" : `${label} (up to ${room})`}
        <input
          name="photos"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={async (e) => {
            const input = e.currentTarget;
            const picked = Array.from(input.files ?? []);
            setNote(picked.length > room ? `Only the first ${room} will be added.` : null);
            setBusy(true);
            const small = await Promise.all(picked.slice(0, room).map(shrink));
            const dt = new DataTransfer();
            small.forEach((f) => dt.items.add(f));
            input.files = dt.files;
            setPreviews((old) => {
              old.forEach((u) => URL.revokeObjectURL(u));
              return small.map((f) => URL.createObjectURL(f));
            });
            setBusy(false);
          }}
        />
      </label>
      {note && <p className="text-xs text-stone-500">{note}</p>}
      {previews.length > 0 && (
        <div className="flex gap-2">
          {previews.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file
            <img key={u} src={u} alt="" className="h-14 w-14 rounded-lg bg-tile object-contain" />
          ))}
          <span className="self-center text-xs text-stone-500">Ready — press Save to upload</span>
        </div>
      )}
    </div>
  );
}
