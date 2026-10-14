import type { Metadata } from "next";
import { msApi } from "@/lib/ms-api";
import type { CheckoutSettings } from "@/lib/ms-types";
import { EmptyState, PageHeader, SectionCard } from "@/components/ms/ui";
import {
  AddDeliveryMethodForm,
  DeliveryMethodRowForm,
  PaymentMethodRowForm,
} from "./forms";

export const metadata: Metadata = { title: "Livraison & paiement" };

export default async function ShippingPage() {
  const settings = await msApi<CheckoutSettings>("/checkout-settings");
  return (
    <>
      <PageHeader
        title="Livraison & paiement"
        description="Frais de livraison et moyens de paiement proposés au checkout. Les changements s'appliquent immédiatement."
      />
      <div className="grid gap-6">
        <SectionCard title="Modes de livraison">
          <p className="mb-3 text-sm text-ms-ink/60">
            « Sur devis » : la commande est envoyée sans paiement, et vous
            communiquez le tarif sur WhatsApp. Le paiement à la livraison
            n&apos;est proposé que pour les modes qui l&apos;autorisent.
          </p>
          <div className="overflow-x-auto">
            {settings.deliveryMethods.length === 0 ? (
              <EmptyState>Aucun mode de livraison.</EmptyState>
            ) : (
              <table className="ms-table min-w-[760px]">
                <thead>
                  <tr>
                    <th scope="col">Mode</th>
                    <th scope="col">Frais</th>
                    <th scope="col">Paiement livraison</th>
                    <th scope="col">Adresse requise</th>
                    <th scope="col">Actif</th>
                    <th scope="col">Position</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {settings.deliveryMethods.map((m) => (
                    <DeliveryMethodRowForm key={m.code} method={m} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4">
            <AddDeliveryMethodForm />
          </div>
        </SectionCard>

        <SectionCard title="Moyens de paiement">
          {!settings.elgiopayConfigured && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-ms-clay/15 p-3 text-sm text-[#8a5a37]"
            >
              La clé ElgioPay n&apos;est pas configurée sur l&apos;API : MTN
              MoMo et Orange Money restent masqués sur le site, même s&apos;ils
              sont actifs ici.
            </p>
          )}
          <p className="mb-3 text-sm text-ms-ink/60">
            La carte bancaire est prévue pour la phase 3. Une commande
            n&apos;est marquée « payée » qu&apos;après confirmation par
            l&apos;agrégateur, ou par vous pour les virements et paiements à la
            livraison.
          </p>
          <div className="overflow-x-auto">
            <table className="ms-table min-w-[620px]">
              <thead>
                <tr>
                  <th scope="col">Moyen</th>
                  <th scope="col">Actif</th>
                  <th scope="col">Position</th>
                  <th scope="col">Sur le site</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {settings.paymentMethods.map((m) => (
                  <PaymentMethodRowForm
                    key={m.code}
                    method={m}
                    elgiopayConfigured={settings.elgiopayConfigured}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
