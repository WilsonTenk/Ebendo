import { DEMO_PRODUCTS } from "./demo-products";
import { supabaseAdmin } from "./supabase/admin";

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  price: number;
  image_url: string | null; // main photo (copy of images[0])
  images?: string[]; // up to 4 photos of the same item, first = main
  stock_qty: number;
  active: boolean;
};

export const CATEGORIES = [
  { id: "appliances", label: "Home appliances", short: "Appliances" },
  { id: "electronics", label: "TVs & electronics", short: "TVs & electronics" },
  { id: "phones", label: "Phones", short: "Phones" },
  { id: "furniture", label: "Furniture", short: "Furniture" },
  { id: "general", label: "Other", short: "Other" },
] as const;

/** The four categories shown in the header, footer and home page. */
export const SHOP_CATEGORIES = CATEGORIES.filter((c) => c.id !== "general");

/** Most photos a product can have (front, side, inside, back). */
export const MAX_PHOTOS = 4;

/** All photos of a product, main first. Falls back to the single main photo. */
export function productPhotos(p: Pick<Product, "image_url" | "images">): string[] {
  if (p.images?.length) return p.images;
  return p.image_url ? [p.image_url] : [];
}

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

/** True when Supabase isn't configured: the storefront shows sample products. */
export const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SORTS = [
  { id: "price_asc", label: "Lowest price first" },
  { id: "price_desc", label: "Highest price first" },
  { id: "newest", label: "Newest" },
] as const;
export type Sort = (typeof SORTS)[number]["id"];

export async function listProducts(
  opts: { category?: string; search?: string; sort?: Sort } = {},
): Promise<Product[]> {
  const search = opts.search?.trim();
  if (isDemo) {
    const s = search?.toLowerCase();
    const found = DEMO_PRODUCTS.map((p, i) => ({ p, i })).filter(
      ({ p }) => (!opts.category || p.category === opts.category) && (!s || p.name.toLowerCase().includes(s)),
    );
    if (opts.sort === "price_asc") found.sort((a, b) => a.p.price - b.p.price);
    else if (opts.sort === "price_desc") found.sort((a, b) => b.p.price - a.p.price);
    else if (opts.sort === "newest") found.sort((a, b) => b.i - a.i); // sample list is oldest first
    else found.sort((a, b) => a.p.name.localeCompare(b.p.name));
    return found.map(({ p }) => p);
  }
  let q = supabaseAdmin().from("products").select("*").eq("active", true);
  if (opts.category) q = q.eq("category", opts.category);
  if (search) q = q.ilike("name", `%${search.replace(/[%_,]/g, " ")}%`);
  if (opts.sort === "price_asc") q = q.order("price", { ascending: true });
  else if (opts.sort === "price_desc") q = q.order("price", { ascending: false });
  else if (opts.sort === "newest") q = q.order("created_at", { ascending: false });
  else q = q.order("name");
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (isDemo) return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
  const { data } = await supabaseAdmin().from("products").select("*").eq("slug", slug).eq("active", true).maybeSingle();
  return data;
}

/** One product by id, including hidden ones (admin). */
export async function getProductById(id: string): Promise<Product | null> {
  if (isDemo) return DEMO_PRODUCTS.find((p) => p.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabaseAdmin().from("products").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Every product including hidden ones, newest first (admin). */
export async function listAllProducts(): Promise<Product[]> {
  if (isDemo) return [...DEMO_PRODUCTS].reverse();
  const { data, error } = await supabaseAdmin().from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** A few other items from the same category, for "You may also like". */
export async function relatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await listProducts({ category: product.category });
  return all.filter((p) => p.id !== product.id).slice(0, limit);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
