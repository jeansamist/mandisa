"use server";

import { refresh } from "next/cache";
import { msMutate } from "@/lib/ms-api";
import { errorMessage, type ActionResult } from "../products/_shared/errors";

// Shipping fees and payment methods are read live by the checkout (no shop cache to refresh).

export type DeliveryMethodInput = {
  feeXaf: number | null;
  allowsCashOnDelivery: boolean;
  requiresAddress: boolean;
  isActive: boolean;
  position: number;
};

async function mutate(
  path: string,
  method: string,
  body: unknown,
): Promise<ActionResult> {
  const result = await msMutate(path, { method, body });
  if (!result.ok)
    return { ok: false, message: errorMessage(result.error, result.details) };
  refresh();
  return { ok: true };
}

export async function createDeliveryMethod(
  input: DeliveryMethodInput & { code: string },
) {
  return mutate("/delivery-methods", "POST", input);
}

export async function updateDeliveryMethod(
  code: string,
  input: DeliveryMethodInput,
) {
  return mutate(`/delivery-methods/${encodeURIComponent(code)}`, "PUT", input);
}

export async function updatePaymentMethod(
  code: string,
  input: { isActive: boolean; position: number },
) {
  return mutate(`/payment-methods/${encodeURIComponent(code)}`, "PUT", input);
}
