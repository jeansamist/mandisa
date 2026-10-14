import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/api";
import ProductView from "@/views/product";

// Placeholder for an empty catalog: Cache Components needs at least one param.
// It renders "not found"; real products added later are served on demand.
const NO_PRODUCT = "_";

export async function generateStaticParams() {
  const products = await getProducts();
  if (products.length === 0) return [{ code: NO_PRODUCT }];
  return products.map((p) => ({ code: p.code.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products/[code]">): Promise<Metadata> {
  const product = await getProduct((await params).code);
  return { title: product?.name };
}

// `code` is URL data: read it inside Suspense so the shared shell stays instant.
export default function Page({
  params,
}: PageProps<"/[locale]/products/[code]">) {
  return (
    <Suspense fallback={<main className="page container" />}>
      <Product params={params} />
    </Suspense>
  );
}

async function Product({
  params,
}: Pick<PageProps<"/[locale]/products/[code]">, "params">) {
  const product = await getProduct((await params).code);
  if (!product) notFound();
  return <ProductView product={product} />;
}
