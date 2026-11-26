import type { Metadata } from "next";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <ProductForm product={null} error={error} />;
}
