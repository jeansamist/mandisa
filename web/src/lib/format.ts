import { useFormatter, useTranslations } from "next-intl";
import type { StockStatus } from "@/lib/catalog";

/** Formats an integer XAF amount for the current locale, e.g. "98 000 FCFA" / "98,000 FCFA". */
export function useFormatPrice() {
  const format = useFormatter();
  return (amountXaf: number, withCurrency = true) => {
    const amount = format.number(amountXaf);
    return withCurrency ? `${amount} FCFA` : amount;
  };
}

/** Translated stock status, e.g. "Plus que 2" / "Only 2 left" for low stock. */
export function useStatusLabel() {
  const t = useTranslations("Catalog.statuses");
  return ({
    status,
    lowStockQuantity,
  }: {
    status: StockStatus;
    lowStockQuantity: number | null;
  }) =>
    status === "lowStock"
      ? t("lowStock", { count: lowStockQuantity ?? 0 })
      : t(status);
}
