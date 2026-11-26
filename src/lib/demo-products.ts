import type { Product } from "./catalog";

/**
 * Sample catalogue used only when Supabase isn't configured (local design work).
 * Names and prices are illustrative, not the shop's real stock.
 */
const items: Array<[name: string, category: string, cedis: number, stock: number, description: string]> = [
  ["Samsung 43\" Smart TV", "electronics", 4200, 3, "Full HD smart TV with Netflix, YouTube and screen mirroring. 1-year warranty."],
  ["Nasco 32\" LED TV", "electronics", 1650, 5, "Bright HD picture, USB playback and a built-in digital decoder."],
  ["Sony Bluetooth Home Theatre", "electronics", 2800, 2, "5.1 surround sound with Bluetooth, FM radio and HDMI."],
  ["Hisense 2-Door Fridge 205L", "appliances", 5300, 2, "Frost-free double-door fridge with low-noise, energy-saving compressor."],
  ["Nasco Chest Freezer 200L", "appliances", 3900, 4, "Deep freezer that holds its cold for hours during light-offs."],
  ["Midea Split Air Conditioner 1.5HP", "appliances", 6800, 1, "Inverter AC that cools fast and keeps the power bill down."],
  ["Binatone Blender 1.5L", "appliances", 450, 10, "Strong motor for pepper, smoothies and grinding."],
  ["Electric Gas Cooker 4-Burner", "appliances", 3600, 2, "Four gas burners with an electric oven and grill."],
  ["Samsung Galaxy A15", "phones", 2400, 6, "6.5\" display, 128GB storage, long-lasting 5000mAh battery."],
  ["Tecno Spark 20", "phones", 1850, 8, "Big screen, 128GB storage and fast charging."],
  ["iPhone 13 (128GB)", "phones", 7900, 2, "UK-used, excellent condition, battery health above 85%."],
  ["Infinix Hot 40i", "phones", 1600, 7, "Affordable all-rounder with 128GB storage."],
  ["3-Seater Fabric Sofa", "furniture", 4500, 2, "Comfortable grey fabric sofa with solid wooden frame."],
  ["Double Bed with Mattress", "furniture", 5200, 1, "Strong wooden double bed and orthopaedic foam mattress."],
  ["Wardrobe 3-Door", "furniture", 3300, 3, "Spacious wardrobe with hanging space, shelves and a mirror."],
  ["Plastic Dining Set (4 chairs)", "furniture", 1200, 5, "Easy-to-clean table with four sturdy chairs."],
];

const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Sample "photos" (simple drawings) so the gallery can be seen in preview mode. */
const DEMO_PHOTOS: Record<string, string[]> = {
  "hisense-2-door-fridge-205l": [
    "/demo/fridge-front.svg",
    "/demo/fridge-open.svg",
    "/demo/fridge-side.svg",
    "/demo/fridge-back.svg",
  ],
};

export const DEMO_PRODUCTS: Product[] = items.map(([name, category, cedis, stock, description], i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  name,
  slug: name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, ""),
  category,
  description,
  price: cedis * 100,
  image_url: DEMO_PHOTOS[slugOf(name)]?.[0] ?? null,
  images: DEMO_PHOTOS[slugOf(name)] ?? [],
  stock_qty: stock,
  active: true,
}));
