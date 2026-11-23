"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/catalog";
import { cedisToPesewas } from "@/lib/money";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminEmail, requireAdmin, supabaseAuth } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await supabaseAuth();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error || !isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=" + encodeURIComponent("Wrong email or password"));
  }
  redirect("/admin");
}

export async function logout() {
  await (await supabaseAuth()).auth.signOut();
  redirect("/admin/login");
}

/** Shop staff hands the item over: completed -> collected. */
export async function markCollected(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await supabaseAdmin()
    .from("plans")
    .update({ status: "collected", collected_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "completed");
  revalidatePath("/admin");
}

async function uploadImage(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("Product photo must be an image");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const db = supabaseAdmin();
  const { error } = await db.storage.from("products").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return db.storage.from("products").getPublicUrl(path).data.publicUrl;
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const price = cedisToPesewas(String(formData.get("price") ?? ""));
  const stock = Number(formData.get("stock") ?? 0);
  if (!name || !(price > 0) || !Number.isInteger(stock) || stock < 0) {
    redirect("/admin/products?error=" + encodeURIComponent("Name, a price above 0 and a whole-number stock are required"));
  }

  const image_url = await uploadImage(formData.get("image") as File | null);
  const db = supabaseAdmin();
  const base = slugify(name) || "item";
  // Make the slug unique by appending a short suffix if needed.
  const { data: clash } = await db.from("products").select("id").eq("slug", base).maybeSingle();
  const slug = clash ? `${base}-${crypto.randomUUID().slice(0, 4)}` : base;

  const { error } = await db.from("products").insert({
    name,
    slug,
    category: String(formData.get("category") ?? "general"),
    description: String(formData.get("description") ?? "").trim() || null,
    price,
    stock_qty: stock,
    image_url,
  });
  if (error) throw error;
  revalidatePath("/admin/products");
  redirect("/admin/products?saved=1");
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const price = cedisToPesewas(String(formData.get("price") ?? ""));
  const stock = Number(formData.get("stock"));
  if (!(price > 0) || !Number.isInteger(stock) || stock < 0) {
    redirect("/admin/products?error=" + encodeURIComponent("Price must be above 0 and stock a whole number"));
  }
  const patch: Record<string, unknown> = {
    price,
    stock_qty: stock,
    active: formData.get("active") === "on",
    updated_at: new Date().toISOString(),
  };
  const image_url = await uploadImage(formData.get("image") as File | null);
  if (image_url) patch.image_url = image_url;
  const { error } = await supabaseAdmin().from("products").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/products");
}
