import { type Anthropic } from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { aiConversations } from "../../db/schema.js";
import { env } from "../../env.js";
import { getProduct, listProducts, type ProductSummary } from "../catalog.js";
import {
  availablePaymentMethods,
  listDeliveryOptions,
} from "../checkout-options.js";
import { recordEvent } from "../checkout-events.js";
import { notifyAdmin } from "../notifications.js";

// Read-only tools (+ handoff), per CLAUDE.md §7: the assistant never writes
// prices, stock or orders. Every input is validated server side.

const nullable = (schema: Record<string, unknown>) => ({
  ...schema,
  type: [schema.type as string, "null"],
});

export const toolDefinitions: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_catalog",
    description:
      "Lists Mandisa wigs with their texture, starting price (XAF), and availability (inStock, lowStock, preorder, soldOut). Use it before recommending or comparing products. Filters are optional (null = no filter).",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        texture: nullable({
          type: "string",
          enum: ["afro", "kinkyYaki", "lightYaki", "curly", null],
          description: "Afro, kinky yaki, light yaki or curly (bouclées).",
        }),
        max_price_xaf: nullable({
          type: "integer",
          description: "Maximum starting price in XAF.",
        }),
        available_only: {
          type: "boolean",
          description: "true to exclude sold-out wigs.",
        },
      },
      required: ["texture", "max_price_xaf", "available_only"],
      additionalProperties: false,
    },
  },
  {
    name: "get_product_details",
    description:
      "Details of one wig: description, and every variant (length in inches, color, cap size S/M/L) with its price in XAF and availability. Use it for exact prices, lengths, sizes and stock.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        product_code: {
          type: "string",
          description: 'Product code, e.g. "MDS-W01".',
        },
      },
      required: ["product_code"],
      additionalProperties: false,
    },
  },
  {
    name: "get_delivery_and_payment",
    description:
      "Delivery methods with their fee in XAF (null = quoted by the team on WhatsApp before payment) and the payment methods currently offered at checkout.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get_store_information",
    description:
      "Store facts written by the team: FAQ, returns and exchange policy, care guide, contacts. The only source for policies.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "handoff_to_human",
    description:
      "Passes the conversation to the Mandisa team on WhatsApp. Use it when the customer asks for a person, after payment, for order tracking, cancellations, returns, exchanges, refunds, damaged products, disputes, or whenever the needed information is missing.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          enum: [
            "customer_request",
            "order_or_payment",
            "return_or_refund",
            "missing_information",
            "other",
          ],
        },
        summary: {
          type: "string",
          description:
            "One or two sentences for the team: what the customer needs.",
        },
      },
      required: ["reason", "summary"],
      additionalProperties: false,
    },
  },
];

const inputs = {
  search_catalog: z.object({
    texture: z.enum(["afro", "kinkyYaki", "lightYaki", "curly"]).nullish(),
    max_price_xaf: z.number().int().positive().nullish(),
    available_only: z.boolean(),
  }),
  get_product_details: z.object({ product_code: z.string().trim().max(32) }),
  get_delivery_and_payment: z.object({}),
  get_store_information: z.object({}),
  handoff_to_human: z.object({
    reason: z.enum([
      "customer_request",
      "order_or_payment",
      "return_or_refund",
      "missing_information",
      "other",
    ]),
    summary: z.string().trim().max(600),
  }),
};

export type ToolContext = {
  conversationId: string;
  locale: string;
  knowledge: string;
  /** Products returned by tools this turn, shown as cards next to the answer. */
  products: Map<string, ProductSummary>;
  handedOff: boolean;
};

const productPath = (locale: string, code: string) =>
  `/${locale}/products/${code.toLowerCase()}`;

/** Runs one tool call. Returns the JSON result, or throws on invalid input. */
export async function runTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<unknown> {
  switch (name) {
    case "search_catalog": {
      const input = inputs.search_catalog.parse(rawInput);
      const results = (await listProducts()).filter(
        (p) =>
          (!input.texture || p.texture === input.texture) &&
          (!input.max_price_xaf || p.priceXaf <= input.max_price_xaf) &&
          (!input.available_only || p.status !== "soldOut"),
      );
      for (const p of results.slice(0, 3)) ctx.products.set(p.code, p);
      return results.map((p) => ({
        code: p.code,
        name: p.name,
        texture: p.texture,
        startingPriceXaf: p.priceXaf,
        availability: p.status,
        unitsLeft: p.lowStockQuantity,
        url: productPath(ctx.locale, p.code),
      }));
    }
    case "get_product_details": {
      const input = inputs.get_product_details.parse(rawInput);
      const product = await getProduct(input.product_code);
      if (!product) return { error: "product_not_found" };
      const summary = (await listProducts()).find(
        (p) => p.code === product.code,
      );
      if (summary) ctx.products.set(summary.code, summary);
      return {
        code: product.code,
        name: product.name,
        texture: product.texture,
        description:
          ctx.locale === "en" ? product.description.en : product.description.fr,
        availability: product.status,
        url: productPath(ctx.locale, product.code),
        variants: product.variants.map((v) => ({
          lengthInches: v.lengthInches,
          color: v.color,
          capSize: v.capSize,
          priceXaf: v.priceXaf,
          availability: v.status,
          unitsLeft: v.lowStockQuantity,
        })),
      };
    }
    case "get_delivery_and_payment": {
      inputs.get_delivery_and_payment.parse(rawInput);
      const delivery = await listDeliveryOptions(db);
      return {
        deliveryMethods: delivery.map((d) => ({
          code: d.code,
          feeXaf: d.feeXaf,
          feeQuotedOnWhatsapp: d.feeXaf === null,
          cashOnDeliveryAllowed: d.allowsCashOnDelivery,
        })),
        paymentMethods: await availablePaymentMethods(db, null),
        notes: [
          "Cash on delivery is only offered for delivery methods that allow it.",
          "Full payment is required before confirmation, except cash on delivery.",
        ],
      };
    }
    case "get_store_information":
      inputs.get_store_information.parse(rawInput);
      return { information: ctx.knowledge };
    case "handoff_to_human": {
      const input = inputs.handoff_to_human.parse(rawInput);
      await db.transaction(async (tx) => {
        await tx
          .update(aiConversations)
          .set({ status: "handed_off" })
          .where(eq(aiConversations.id, ctx.conversationId));
        await notifyAdmin(tx, {
          orderId: null,
          template: "admin_ai_handoff",
          params: {
            reason: input.reason,
            summary: input.summary,
            conversationId: ctx.conversationId,
          },
        });
        await recordEvent(tx, {
          type: "ai_handoff",
          data: { conversationId: ctx.conversationId, reason: input.reason },
        });
      });
      ctx.handedOff = true;
      return {
        handedOff: true,
        whatsapp: whatsappNumber(),
        instruction:
          "Tell the customer the team will continue on WhatsApp and give them the number.",
      };
    }
    default:
      throw new Error(`unknown tool ${name}`);
  }
}

export function whatsappNumber() {
  return env.ADMIN_WHATSAPP ?? "+237650911804";
}
