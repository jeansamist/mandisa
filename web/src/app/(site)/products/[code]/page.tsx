import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProduct, products } from "@/lib/catalog";
import ProductView from "@/views/product";

export function generateStaticParams() {
  return products.map((p) => ({ code: p.code.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps<"/products/[code]">): Promise<Metadata> {
  const product = findProduct((await params).code);
  return { title: product?.name };
}

export default async function Page({ params }: PageProps<"/products/[code]">) {
  const product = findProduct((await params).code);
  if (!product) notFound();
  return <ProductView product={product} />;
}
