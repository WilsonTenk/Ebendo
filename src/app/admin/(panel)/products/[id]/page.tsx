import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/catalog";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit product" };

export default async function EditProduct({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [{ id }, { error, saved }] = await Promise.all([params, searchParams]);
  const product = await getProductById(id);
  if (!product) notFound();
  return <ProductForm product={product} error={error} saved={Boolean(saved)} />;
}
