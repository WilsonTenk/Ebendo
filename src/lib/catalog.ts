import { supabaseAdmin } from "./supabase/admin";

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock_qty: number;
  active: boolean;
};

export const CATEGORIES = [
  { id: "appliances", label: "Home appliances" },
  { id: "electronics", label: "Electronics" },
  { id: "phones", label: "Phones" },
  { id: "furniture", label: "Furniture" },
  { id: "general", label: "Other" },
] as const;

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export async function listProducts(category?: string): Promise<Product[]> {
  let q = supabaseAdmin().from("products").select("*").eq("active", true).order("name");
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getProduct(slug: string): Promise<Product | null> {
  const { data } = await supabaseAdmin().from("products").select("*").eq("slug", slug).eq("active", true).maybeSingle();
  return data;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
