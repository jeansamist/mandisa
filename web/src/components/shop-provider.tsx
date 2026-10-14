"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { CartLine } from "@/lib/checkout";
import { trackEvent } from "@/lib/tracker";
import { Icon } from "@/components/ui";
import { ease } from "@/components/motion";

const MAX_QUANTITY = 10;
const STORAGE_KEY = "mandisa.cart";

type ShopContextValue = {
  cart: CartLine[];
  /** False until the saved cart has been read (right after hydration). */
  cartLoaded: boolean;
  cartCount: number;
  addToCart: (sku: string, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}

// The cart is a per-visitor convenience: kept in this browser only.
function loadCart(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed.filter(
          (l): l is CartLine =>
            typeof l?.sku === "string" &&
            Number.isInteger(l?.quantity) &&
            l.quantity > 0,
        )
      : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Private mode or blocked storage: the cart lives for this tab only.
  }
}

export default function ShopProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("Toast");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Read after hydration so server and client first render the same empty cart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(loadCart());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveCart(cart);
  }, [cart, loaded]);

  const addToCart = (sku: string, quantity = 1) => {
    trackEvent("add_to_cart", { sku, quantity });
    setCart((lines) => {
      const existing = lines.find((l) => l.sku === sku);
      if (!existing) {
        return [...lines, { sku, quantity: Math.min(quantity, MAX_QUANTITY) }];
      }
      return lines.map((l) =>
        l.sku === sku
          ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QUANTITY) }
          : l,
      );
    });
    setToast(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(false), 2200);
  };

  const setQuantity = (sku: string, quantity: number) =>
    setCart((lines) =>
      lines.map((l) =>
        l.sku === sku
          ? { ...l, quantity: Math.max(1, Math.min(quantity, MAX_QUANTITY)) }
          : l,
      ),
    );

  const removeFromCart = (sku: string) => {
    trackEvent("remove_from_cart", { sku });
    setCart((lines) => lines.filter((l) => l.sku !== sku));
  };

  const clearCart = () => setCart([]);

  return (
    <ShopContext.Provider
      value={{
        cart,
        cartLoaded: loaded,
        cartCount: cart.reduce((sum, l) => sum + l.quantity, 0),
        addToCart,
        setQuantity,
        removeFromCart,
        clearCart,
        assistantOpen,
        setAssistantOpen,
      }}
    >
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            // Keep the CSS centering: motion owns `transform` while animating.
            style={{ x: "-50%" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease }}
          >
            <Icon name="check" /> {t("added")}{" "}
            <button onClick={() => router.push("/cart")}>{t("view")}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </ShopContext.Provider>
  );
}
