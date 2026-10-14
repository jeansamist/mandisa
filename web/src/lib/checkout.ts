import type { CapSize, StockStatus } from "@/lib/catalog";

// Mirrors the API's checkout and order payloads (api/src/services/quote.ts, orders.ts).

export type CartLine = { sku: string; quantity: number };

export type PaymentMethodCode =
  "mtn_momo" | "orange_money" | "bank_transfer" | "cash_on_delivery" | "card";

export type DeliveryOption = {
  code: string;
  /** Null: quoted by the founder before payment. */
  feeXaf: number | null;
  requiresAddress: boolean;
  allowsCashOnDelivery: boolean;
};

export type QuoteLine = {
  sku: string;
  productCode: string;
  productName: string;
  lengthInches: number;
  color: string;
  capSize: CapSize;
  imageUrl: string | null;
  unitPriceXaf: number;
  quantity: number;
  lineTotalXaf: number;
  isPreorder: boolean;
  status: StockStatus;
  problem: "out_of_stock" | null;
  available: number;
};

export type Quote = {
  lines: QuoteLine[];
  problems: { sku: string; problem: "out_of_stock" | "unknown_item" }[];
  isPreorder: boolean;
  subtotalXaf: number;
  deliveryOptions: DeliveryOption[];
  deliveryMethod: string | null;
  deliveryFeeXaf: number | null;
  totalXaf: number | null;
  paymentMethods: PaymentMethodCode[];
};

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "payment_review"
  | "paid"
  | "in_preparation"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "return_received"
  | "exchanged"
  | "refunded";

export type OrderView = {
  number: string;
  status: OrderStatus;
  locale: string;
  createdAt: string;
  customerFirstName: string;
  isPreorder: boolean;
  items: (Omit<QuoteLine, "status" | "problem" | "available"> & {
    isPreorder: boolean;
  })[];
  subtotalXaf: number;
  deliveryFeeXaf: number | null;
  totalXaf: number | null;
  delivery: { method: string; address: Record<string, string> | null };
  paymentMethod: PaymentMethodCode | null;
  payment: {
    status: "pending" | "completed" | "failed" | "expired";
    method: PaymentMethodCode;
    failureCode: string | null;
    phoneHint: string | null;
  } | null;
};

export type PlaceOrderInput = {
  sessionId: string | null;
  idempotencyKey: string;
  locale: string;
  cart: CartLine[];
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  delivery: {
    method: string;
    city?: string;
    district?: string;
    landmark?: string;
    address?: string;
  };
  paymentMethod: PaymentMethodCode | null;
  paymentPhone: string | null;
  transferReference: string | null;
  acceptTerms: true;
  marketingOptIn: boolean;
};

export type CheckoutEvent =
  | { type: "step_viewed"; step: "info" | "delivery" | "payment" }
  | {
      type: "contact_submitted";
      contact: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string | null;
      };
    }
  | { type: "delivery_selected"; method: string }
  | { type: "payment_selected"; method: PaymentMethodCode };

/** Result of an action: the API's stable error code on failure. */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

export function orderConfirmationHref(number: string, token: string) {
  const params = new URLSearchParams({ order: number, token });
  return `/order-confirmation?${params}`;
}
