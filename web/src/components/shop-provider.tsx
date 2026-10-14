"use client";

import { createContext, useContext, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Icon } from "@/components/ui";

type ShopContextValue = {
  cartCount: number;
  setCartCount: (n: number) => void;
  addToCart: () => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}

export default function ShopProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("Toast");
  const [cartCount, setCartCount] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const addToCart = () => {
    setCartCount((n) => n + 1);
    setToast(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(false), 2200);
  };

  return (
    <ShopContext.Provider
      value={{
        cartCount,
        setCartCount,
        addToCart,
        assistantOpen,
        setAssistantOpen,
      }}
    >
      {children}
      {toast && (
        <div className="toast">
          <Icon name="check" /> {t("added")}{" "}
          <button onClick={() => router.push("/cart")}>{t("view")}</button>
        </div>
      )}
    </ShopContext.Provider>
  );
}
