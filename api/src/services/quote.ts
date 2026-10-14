import { z } from "zod";
import { db } from "../db/client.js";
import {
  availablePaymentMethods,
  listDeliveryOptions,
} from "./checkout-options.js";
import { cartProblems, cartSchema, priceCart } from "./pricing.js";

export const quoteSchema = z.object({
  cart: cartSchema,
  deliveryMethod: z.string().max(40).nullish(),
});

/**
 * Everything the cart and checkout pages display: priced lines, delivery
 * options with their fees, totals, and the payment methods allowed for the
 * chosen delivery. All computed by the backend.
 */
export async function quoteCart(input: z.infer<typeof quoteSchema>) {
  const cart = await priceCart(db, input.cart);
  const deliveryOptions = await listDeliveryOptions(db);
  const delivery =
    deliveryOptions.find((d) => d.code === input.deliveryMethod) ?? null;
  const deliveryFeeXaf = delivery?.feeXaf ?? null;

  return {
    lines: cart.lines,
    problems: cartProblems(cart),
    isPreorder: cart.isPreorder,
    subtotalXaf: cart.subtotalXaf,
    deliveryOptions,
    deliveryMethod: delivery?.code ?? null,
    deliveryFeeXaf,
    /** Null until a delivery method with a known fee is chosen. */
    totalXaf:
      delivery && deliveryFeeXaf !== null
        ? cart.subtotalXaf + deliveryFeeXaf
        : null,
    paymentMethods: await availablePaymentMethods(db, delivery),
  };
}
