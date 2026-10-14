import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { msApi, MsApiError } from "@/lib/ms-api";
import type { AdminProduct } from "@/lib/ms-types";
import { EmptyState, PageHeader, SectionCard } from "@/components/ms/ui";
import ProductForm from "../_shared/product-form";
import MediaManager from "./media";
import { AddVariantForm, VariantRow } from "./variants";

export const metadata: Metadata = { title: "Modifier le produit" };

async function loadProduct(code: string) {
  try {
    return await msApi<AdminProduct>(`/products/${encodeURIComponent(code)}`);
  } catch (err) {
    if (err instanceof MsApiError && err.status === 404) notFound();
    throw err;
  }
}

export default async function EditProductPage({
  params,
}: PageProps<"/ms/products/[code]">) {
  const product = await loadProduct(decodeURIComponent((await params).code));
  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.code} · ${product.variants.length} variante(s)`}
        actions={
          <>
            <Link
              href={`/fr/products/${product.code.toLowerCase()}`}
              target="_blank"
              className="ms-btn ms-btn-outline"
            >
              Voir sur le site ↗
            </Link>
            <Link href="/ms/products" className="ms-btn ms-btn-outline">
              Retour
            </Link>
          </>
        }
      />
      <div className="grid gap-6">
        <ProductForm
          mode="edit"
          initial={{
            code: product.code,
            name: product.name,
            texture: product.texture,
            descriptionFr: product.descriptionFr,
            descriptionEn: product.descriptionEn,
            isActive: product.isActive,
          }}
        />

        <SectionCard title="Variantes, prix et stock">
          <p className="mb-3 text-sm text-ms-ink/60">
            « Disponible / réservé » : unités vendables et unités bloquées par
            des commandes en attente de paiement. Chaque changement de stock est
            journalisé avec son motif.
          </p>
          <div className="overflow-x-auto">
            {product.variants.length === 0 ? (
              <EmptyState>
                Aucune variante : ce produit ne peut pas encore être vendu.
              </EmptyState>
            ) : (
              <table className="ms-table min-w-[900px]">
                <thead>
                  <tr>
                    <th scope="col">Variante</th>
                    <th scope="col">Prix (FCFA)</th>
                    <th scope="col">Stock physique</th>
                    <th scope="col">Dispo / réservé</th>
                    <th scope="col">Seuil</th>
                    <th scope="col">Précommande</th>
                    <th scope="col">Statut</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((v) => (
                    <VariantRow key={v.sku} variant={v} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4">
            <AddVariantForm code={product.code} />
          </div>
        </SectionCard>

        <SectionCard title="Photos et vidéos">
          <MediaManager code={product.code} media={product.media} />
        </SectionCard>
      </div>
    </>
  );
}
