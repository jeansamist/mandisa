"use server";

import { API_URL, apiHeaders } from "@/lib/api";
import type {
  ActionResult,
  CartLine,
  CheckoutEvent,
  OrderView,
  PlaceOrderInput,
  Quote,
} from "@/lib/checkout";

// Server actions: the browser calls these, they call the API with the internal key.

async function call<T>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<ActionResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      headers: apiHeaders({
        "content-type": "application/json",
        ...init.headers,
      }),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    if (res.status === 204) return { ok: true, data: undefined as T };
    const json = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!res.ok) return { ok: false, error: json?.error ?? "generic" };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "network" };
  }
}

export async function quoteCart(
  cart: CartLine[],
  deliveryMethod?: string | null,
) {
  return call<Quote>("/checkout/quote", {
    method: "POST",
    body: { cart, deliveryMethod: deliveryMethod ?? null },
  });
}

export async function startCheckout(
  locale: string,
  cart: CartLine[],
  visitorId: string | null,
) {
  return call<{ id: string }>("/checkout/sessions", {
    method: "POST",
    body: { locale, cart, visitorId },
  });
}

export async function trackCheckout(sessionId: string, event: CheckoutEvent) {
  // Tracking must never break the checkout: errors are ignored.
  await call(`/checkout/sessions/${encodeURIComponent(sessionId)}/events`, {
    method: "POST",
    body: event,
  });
}

export async function placeOrder(input: PlaceOrderInput) {
  return call<OrderView & { accessToken: string }>("/orders", {
    method: "POST",
    body: input,
  });
}

export async function getOrder(number: string, token: string) {
  return call<OrderView>(`/orders/${encodeURIComponent(number)}`, {
    headers: { "x-order-token": token },
  });
}

export async function retryPayment(
  number: string,
  token: string,
  phone: string | null,
) {
  return call<OrderView>(`/orders/${encodeURIComponent(number)}/payments`, {
    method: "POST",
    body: { phone },
    headers: { "x-order-token": token },
  });
}
