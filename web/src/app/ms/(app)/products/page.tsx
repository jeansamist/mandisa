import type { Metadata } from "next";
import Link from "next/link";
import { msApi } from "@/lib/ms-api";
import type { AdminProductRow } from "@/lib/ms-types";
import { formatNumber, formatXaf, textureLabels } from "@/components/ms/format";
import { Badge, EmptyState, PageHeader } from "@/components/ms/ui";

export const metadata: Metadata = { title: "Produits & stock" };

export default async function ProductsPage() {
  const products = await msApi<AdminProductRow[]>("/products");
  return (
    <>
      <PageHeader
        title="Produits & stock"
        description="Catalogue, variantes, prix, stock et photos."
        actions={
          <Link href="/ms/products/new" className="ms-btn">
            Nouveau produit
          </Link>
        }
      />
      <div className="ms-card overflow-x-auto p-0">
        {products.length === 0 ? (
          <EmptyState>Aucun produit pour le moment.</EmptyState>
        ) : (
          <table className="ms-table min-w-[820px]">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Photo</span>
                </th>
                <th scope="col">Produit</th>
                <th scope="col">Texture</th>
                <th scope="col">À partir de</th>
                <th scope="col">Variantes</th>
                <th scope="col">Stock / réservé</th>
                <th scope="col">Alertes</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.code}>
                  <td className="w-16">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-ms-sand" />
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/ms/products/${encodeURIComponent(p.code)}`}
                      className="font-medium text-ms-green hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="font-mono text-xs text-ms-ink/50">{p.code}</p>
                  </td>
                  <td>{textureLabels[p.texture] ?? p.texture}</td>
                  <td>{formatXaf(p.priceFromXaf)}</td>
                  <td>{p.variantCount}</td>
                  <td>
                    {formatNumber(p.stockOnHand)} /{" "}
                    {formatNumber(p.stockReserved)}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {p.lowStockVariants > 0 && (
                        <Badge tone="warn">
                          {p.lowStockVariants} stock faible
                        </Badge>
                      )}
                      {p.soldOutVariants > 0 && (
                        <Badge tone="bad">{p.soldOutVariants} épuisée(s)</Badge>
                      )}
                      {p.lowStockVariants === 0 && p.soldOutVariants === 0 && (
                        <span className="text-ms-ink/40">—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {p.isActive ? (
                      <Badge tone="good">Actif</Badge>
                    ) : (
                      <Badge>Masqué</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
