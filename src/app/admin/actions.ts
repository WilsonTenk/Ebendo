"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATEGORIES, MAX_PHOTOS, productPhotos, slugify } from "@/lib/catalog";
import { formatGHS, cedisToPesewas } from "@/lib/money";
import { getPlanDetail } from "@/lib/plan-data";
import { balance, isOpen, minDeposit, moneyError, receiptMessage, textCustomer, type Plan, type RecordResult } from "@/lib/plans";
import { rules, siteUrl } from "@/lib/config";
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

/** Shop staff hands the item over: completed -> collected. Only fully paid plans. */
export async function markCollected(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const ref = String(formData.get("ref") ?? "");
  await supabaseAdmin()
    .from("plans")
    .update({ status: "collected", collected_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "completed");
  revalidatePath("/admin");
  if (ref) redirect(`/admin/plans/${ref}?done=collected`);
}

const planPath = (ref: string) => `/admin/plans/${ref}`;
const back = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`);

/** The smallest payment a plan accepts right now (first payment, or a top-up). */
function minimumFor(plan: Pick<Plan, "status" | "price" | "total_paid">) {
  return plan.status === "pending_deposit" ? minDeposit(plan.price) : Math.min(rules.minPayment, balance(plan));
}

/** Staff take cash at the counter. Saved with their email and a receipt number; can't be edited. */
export async function recordCash(formData: FormData) {
  const staff = await requireAdmin();
  const ref = String(formData.get("ref") ?? "");
  const path = `${planPath(ref)}/cash`;
  const plan = await getPlanDetail(ref);
  if (!plan) back("/admin", "Plan not found");
  if (!isOpen(plan!)) back(path, "This plan is not taking payments");
  if (formData.get("counted") !== "on") back(path, "Tick the box to confirm you have counted the cash");

  const amount = cedisToPesewas(String(formData.get("amount") ?? ""));
  const min = minimumFor(plan!);
  const owed = balance(plan!);
  if (!(amount >= min)) back(path, `The minimum is ${formatGHS(min)}`);
  if (amount > owed) back(path, `Only ${formatGHS(owed)} is left to pay. Don't take more than that.`);

  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  const { data, error } = await supabaseAdmin().rpc("record_payment", {
    p_reference: `CASH-${crypto.randomUUID()}`,
    p_plan_ref: ref,
    p_amount: amount,
    p_channel: "cash",
    p_raw: null,
    p_method: "cash",
    p_recorded_by: staff.email ?? null,
    p_note: note,
  });
  if (error) back(path, moneyError(error, "The payment could not be saved. Nothing was recorded."));
  const result = data as RecordResult;
  await textCustomer(result.plan, receiptMessage(result, amount, `in cash (receipt ${result.receipt_no})`));
  revalidatePath("/admin");
  redirect(`${planPath(ref)}?done=cash&receipt=${encodeURIComponent(result.receipt_no ?? "")}`);
}

/** Customer at the counter wants to stop: item back in stock, everything paid becomes store credit. */
export async function cancelPlanByStaff(formData: FormData) {
  const staff = await requireAdmin();
  const ref = String(formData.get("ref") ?? "");
  const plan = await getPlanDetail(ref);
  if (!plan) back("/admin", "Plan not found");
  if (formData.get("confirm") !== "on") back(planPath(ref), "Tick the box to confirm the customer wants to cancel");
  const { data, error } = await supabaseAdmin().rpc("end_plan", {
    p_plan_id: plan!.id,
    p_reason: "cancelled_by_staff",
    p_by: staff.email ?? null,
  });
  if (error) throw error;
  const ended = data as { ended: boolean; plan: Plan };
  if (!ended.ended) back(planPath(ref), "This plan has already ended");
  if (ended.plan.credited_amount > 0) {
    await textCustomer(
      ended.plan,
      `Ebendo: plan ${ref} has been cancelled. The item is back on sale and the ${formatGHS(ended.plan.credited_amount)} you paid is now your store credit. Use it on any item: ${siteUrl}/credit`,
    );
  }
  revalidatePath("/admin");
  redirect(`${planPath(ref)}?done=cancelled`);
}

/** Customer at the counter pays towards a plan with their store credit. */
export async function applyCreditByStaff(formData: FormData) {
  const staff = await requireAdmin();
  const ref = String(formData.get("ref") ?? "");
  const plan = await getPlanDetail(ref);
  if (!plan) back("/admin", "Plan not found");
  const amount = cedisToPesewas(String(formData.get("amount") ?? ""));
  const min = minimumFor(plan!);
  if (!(amount >= min)) back(planPath(ref), `The minimum is ${formatGHS(min)}`);
  const { data, error } = await supabaseAdmin().rpc("spend_credit", {
    p_plan_ref: ref,
    p_amount: amount,
    p_by: staff.email ?? null,
  });
  if (error) back(planPath(ref), moneyError(error));
  await textCustomer((data as RecordResult).plan, receiptMessage(data as RecordResult, amount, "from your store credit"));
  revalidatePath("/admin");
  redirect(`${planPath(ref)}?done=credit`);
}

const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // photos are shrunk in the browser to ~200–400 KB first

async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Product photos must be images");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Each photo must be under 3 MB");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const db = supabaseAdmin();
  const { error } = await db.storage.from("products").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return db.storage.from("products").getPublicUrl(path).data.publicUrl;
}

/** Upload the photos picked in a form (field "photos", several allowed), up to `room` of them. */
async function uploadPhotos(formData: FormData, room: number): Promise<string[]> {
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const urls: string[] = [];
  for (const f of files.slice(0, Math.max(room, 0))) urls.push(await uploadImage(f));
  return urls;
}

/** Save a product's photo list; the first photo is also kept as `image_url` (the main photo). */
async function savePhotos(id: string, images: string[]) {
  const { error } = await supabaseAdmin()
    .from("products")
    .update({ images, image_url: images[0] ?? null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function currentPhotos(id: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin().from("products").select("images, image_url").eq("id", id).single();
  if (error) throw error;
  return productPhotos(data);
}


const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as string[];

/** Read and check the product fields shared by Add and Edit. Returns an error sentence or the values. */
function productFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const price = cedisToPesewas(String(formData.get("price") ?? ""));
  const stock = Number(formData.get("stock"));
  const category = String(formData.get("category") ?? "general");
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000) || null;
  if (!name) return { error: "Give the product a name" } as const;
  if (!(price > 0)) return { error: "The price must be more than 0" } as const;
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock must be a whole number (0 or more)" } as const;
  return {
    values: {
      name,
      price,
      stock_qty: stock,
      category: CATEGORY_IDS.includes(category) ? category : "general",
      description,
      active: formData.get("active") === "on",
    },
  } as const;
}

/** Add a product (its own screen: /admin/products/new). */
export async function createProduct(formData: FormData) {
  await requireAdmin();
  const fields = productFields(formData);
  if ("error" in fields) back("/admin/products/new", fields.error!);
  const v = fields.values!;

  let images: string[] = [];
  try {
    images = await uploadPhotos(formData, MAX_PHOTOS);
  } catch (e) {
    back("/admin/products/new", e instanceof Error ? e.message : "A photo could not be uploaded");
  }
  const db = supabaseAdmin();
  const base = slugify(v.name) || "item";
  // Make the slug unique by appending a short suffix if needed.
  const { data: clash } = await db.from("products").select("id").eq("slug", base).maybeSingle();
  const slug = clash ? `${base}-${crypto.randomUUID().slice(0, 4)}` : base;

  const { data, error } = await db
    .from("products")
    .insert({ ...v, slug, images, image_url: images[0] ?? null })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}?saved=1`);
}

/** Save the Edit screen. New photos are added after the existing ones, up to 4 in total. */
export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const path = `/admin/products/${id}`;
  const fields = productFields(formData);
  if ("error" in fields) back(path, fields.error!);

  const { error } = await supabaseAdmin()
    .from("products")
    .update({ ...fields.values!, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  const existing = await currentPhotos(id);
  try {
    const added = await uploadPhotos(formData, MAX_PHOTOS - existing.length);
    if (added.length) await savePhotos(id, [...existing, ...added]);
  } catch (e) {
    back(path, e instanceof Error ? e.message : "A photo could not be uploaded");
  }
  revalidatePath("/admin/products");
  redirect(`${path}?saved=1`);
}

/** "Make main": move one of the product's own photos to the front. */
export async function makeMainPhoto(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const url = String(formData.get("photo") ?? "");
  const photos = await currentPhotos(id);
  if (!photos.includes(url)) return; // only photos that belong to this product
  await savePhotos(id, [url, ...photos.filter((p) => p !== url)]);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

/** Remove one photo from a product (the file stays in storage; nothing else links to it). */
export async function removePhoto(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const url = String(formData.get("photo") ?? "");
  const photos = await currentPhotos(id);
  if (!photos.includes(url)) return;
  await savePhotos(id, photos.filter((p) => p !== url));
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}
