import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ms/ui";
import ProductForm from "../_shared/product-form";

export const metadata: Metadata = { title: "Nouveau produit" };

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="Nouveau produit"
        description="Créez le modèle, puis ajoutez ses variantes et ses photos."
        actions={
          <Link href="/ms/products" className="ms-btn ms-btn-outline">
            Retour
          </Link>
        }
      />
      <ProductForm mode="create" />
    </>
  );
}
