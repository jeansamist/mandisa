import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { orderInput, resetDatabase } from "../../test/fixtures.js";
import { db, pool } from "../db/client.js";
import {
  checkoutEvents,
  notifications,
  orders,
  payments,
  reservations,
  stockMovements,
  variants,
} from "../db/schema.js";
import { elgiopay, signWebhook } from "../integrations/elgiopay.js";
import { cancelUnpaidOrders, expireReservations } from "../jobs/index.js";
import {
  startCheckoutSession,
  trackCheckoutEvent,
} from "./checkout-sessions.js";
import { CheckoutError } from "./errors.js";
import { createOrder, retryPayment } from "./orders.js";
import { handleElgioPayWebhook } from "./payment-webhooks.js";
import {
  checkPaymentStatus,
  checkPendingPayments,
  MAX_STATUS_CHECKS,
} from "./payment-status-check.js";
import { quoteCart } from "./quote.js";

let txnCounter = 0;
const initiate = vi
  .spyOn(elgiopay, "initiatePayment")
  .mockImplementation(async () => ({
    transactionId: `TXN_${++txnCounter}`,
    status: "pending",
  }));

const getPayment = vi.spyOn(elgiopay, "getPayment");

function remoteStatus(status: string, total = 106000, extra = {}) {
  getPayment.mockResolvedValue({
    transaction_id: "TXN_1",
    status,
    amount: { total, currency: "XAF" },
    ...extra,
  });
}

beforeEach(async () => {
  getPayment.mockReset();
  await resetDatabase();
  initiate.mockClear();
  txnCounter = 0;
});

afterAll(async () => {
  await pool.end();
});

async function variant(sku: string) {
  const [v] = await db.select().from(variants).where(eq(variants.sku, sku));
  return v!;
}

async function webhook(
  event: string,
  transactionId: string,
  id: string = crypto.randomUUID(),
  extra = {},
) {
  const body = JSON.stringify({
    id,
    event,
    created: Math.floor(Date.now() / 1000),
    data: {
      transaction_id: transactionId,
      status: event.split(".")[1],
      ...extra,
    },
  });
  return handleElgioPayWebhook(body, signWebhook(body, "whsec_test"));
}

async function expectRefused(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (err) => err instanceof CheckoutError && err.code === code,
  );
}

describe("quote", () => {
  it("prices the cart and lets the backend decide fees and payment methods", async () => {
    const douala = await quoteCart({
      cart: [{ sku: "W01-MANY", quantity: 2 }],
      deliveryMethod: "douala_home",
    });
    expect(douala.subtotalXaf).toBe(212000);
    expect(douala.deliveryFeeXaf).toBe(0);
    expect(douala.totalXaf).toBe(212000);
    expect(douala.paymentMethods).toEqual([
      "mtn_momo",
      "orange_money",
      "bank_transfer",
      "cash_on_delivery",
    ]);

    const yaounde = await quoteCart({
      cart: [{ sku: "W01-MANY", quantity: 1 }],
      deliveryMethod: "yaounde",
    });
    expect(yaounde.deliveryFeeXaf).toBe(3000);
    expect(yaounde.totalXaf).toBe(109000);
    expect(yaounde.paymentMethods).not.toContain("cash_on_delivery");

    const quoted = await quoteCart({
      cart: [{ sku: "W01-MANY", quantity: 1 }],
      deliveryMethod: "other_city",
    });
    expect(quoted.totalXaf).toBeNull();
    expect(quoted.paymentMethods).toEqual([]);
  });

  it("flags unavailable lines and pre-orders", async () => {
    const quote = await quoteCart({
      cart: [
        { sku: "W01-NONE", quantity: 1 },
        { sku: "W01-PRE", quantity: 1 },
        { sku: "NOPE", quantity: 1 },
      ],
    });
    expect(quote.problems).toEqual([
      { sku: "W01-NONE", problem: "out_of_stock", available: 0 },
      { sku: "NOPE", problem: "unknown_item" },
    ]);
    expect(quote.lines.find((l) => l.sku === "W01-PRE")?.isPreorder).toBe(true);
  });
});

describe("checkout tracking", () => {
  it("saves every step of the session", async () => {
    const { id } = await startCheckoutSession({
      locale: "fr",
      cart: [{ sku: "W01-MANY", quantity: 1 }],
    });
    await trackCheckoutEvent(id, { type: "step_viewed", step: "delivery" });
    await trackCheckoutEvent(id, {
      type: "delivery_selected",
      method: "douala_home",
    });
    await trackCheckoutEvent(id, {
      type: "payment_selected",
      method: "mtn_momo",
    });
    await createOrder(orderInput({ sessionId: id }));

    const events = await db
      .select()
      .from(checkoutEvents)
      .where(eq(checkoutEvents.sessionId, id));
    expect(events.map((e) => e.type)).toEqual([
      "checkout_started",
      "step_viewed",
      "delivery_selected",
      "payment_selected",
      "order_created",
    ]);
  });
});

describe("placing an order with mobile money", () => {
  it("reserves stock, starts the payment and queues notifications", async () => {
    const order = await createOrder(orderInput());

    expect(order.number).toBe(`MDS-${new Date().getFullYear()}-0001`);
    expect(order.status).toBe("pending_payment");
    expect(order.totalXaf).toBe(106000);
    expect(order.payment).toMatchObject({
      status: "pending",
      method: "mtn_momo",
      phoneHint: "1804",
    });
    expect(order.accessToken).toHaveLength(32);

    expect(initiate).toHaveBeenCalledWith(
      expect.objectContaining({
        amountXaf: 106000,
        method: "mtn_mobile_money",
        phone: "650911804",
      }),
    );
    expect((await variant("W01-MANY")).stockReserved).toBe(1);

    const queued = await db.select().from(notifications);
    expect(queued.map((n) => [n.recipient, n.template])).toEqual([
      ["customer", "order_received"],
      ["admin", "admin_new_order"],
    ]);
  });

  it("is idempotent", async () => {
    const input = orderInput();
    const first = await createOrder(input);
    const again = await createOrder(input);
    expect(again.number).toBe(first.number);
    expect(again.replayed).toBe(true);
    expect(initiate).toHaveBeenCalledTimes(1);
    expect((await variant("W01-MANY")).stockReserved).toBe(1);
  });

  it("never sells the last unit twice", async () => {
    const results = await Promise.allSettled([
      createOrder(orderInput({ cart: [{ sku: "W01-LAST", quantity: 1 }] })),
      createOrder(orderInput({ cart: [{ sku: "W01-LAST", quantity: 1 }] })),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "cart_unavailable" });
    expect((await variant("W01-LAST")).stockReserved).toBe(1);
  });

  it("refuses payment methods the backend does not allow", async () => {
    await expectRefused(
      createOrder(
        orderInput({
          delivery: { method: "bali_pickup" },
          paymentMethod: "cash_on_delivery",
        }),
      ),
      "payment_method_unavailable",
    );
    await expectRefused(
      createOrder(orderInput({ paymentMethod: "card" })),
      "payment_method_unavailable",
    );
  });

  it("refuses foreign numbers for mobile money", async () => {
    await expectRefused(
      createOrder(orderInput({ paymentPhone: "+33612345678" })),
      "invalid_payment_phone",
    );
  });

  it("refuses out-of-stock items and missing addresses", async () => {
    await expectRefused(
      createOrder(orderInput({ cart: [{ sku: "W01-NONE", quantity: 1 }] })),
      "cart_unavailable",
    );
    await expectRefused(
      createOrder(orderInput({ delivery: { method: "douala_home" } })),
      "address_required",
    );
  });

  it("uses the delivery fee from the database", async () => {
    const order = await createOrder(
      orderInput({ delivery: { method: "yaounde", address: "Bastos" } }),
    );
    expect(order.deliveryFeeXaf).toBe(3000);
    expect(order.totalXaf).toBe(109000);
  });

  it("keeps quoted deliveries as drafts without payment", async () => {
    const order = await createOrder(
      orderInput({
        delivery: {
          method: "other_city",
          city: "Bafoussam",
          address: "Centre",
        },
        paymentMethod: null,
      }),
    );
    expect(order.status).toBe("draft");
    expect(order.totalXaf).toBeNull();
    expect(order.payment).toBeNull();
    expect(initiate).not.toHaveBeenCalled();
  });

  it("takes pre-orders without reserving stock", async () => {
    const order = await createOrder(
      orderInput({ cart: [{ sku: "W01-PRE", quantity: 1 }] }),
    );
    expect(order.isPreorder).toBe(true);
    expect(await db.select().from(reservations)).toHaveLength(0);
  });

  it("puts bank transfers with a reference in review", async () => {
    const order = await createOrder(
      orderInput({
        paymentMethod: "bank_transfer",
        transferReference: "VIR-123",
      }),
    );
    expect(order.status).toBe("payment_review");
    expect(initiate).not.toHaveBeenCalled();
  });
});

describe("ElgioPay webhooks", () => {
  it("marks the order paid and turns the reservation into a sale, once", async () => {
    const order = await createOrder(orderInput());
    const eventId = "evt_paid";

    expect(await webhook("payment.completed", "TXN_1", eventId)).toBe(
      "processed",
    );
    expect(await webhook("payment.completed", "TXN_1", eventId)).toBe(
      "duplicate",
    );
    // A different event id for the same payment changes nothing either.
    expect(await webhook("payment.completed", "TXN_1")).toBe("processed");

    const [saved] = await db
      .select()
      .from(orders)
      .where(eq(orders.number, order.number));
    expect(saved!.status).toBe("paid");
    expect(saved!.paidAt).not.toBeNull();
    const v = await variant("W01-MANY");
    expect(v.stockOnHand).toBe(4);
    expect(v.stockReserved).toBe(0);
    const sales = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, "sale"));
    expect(sales).toHaveLength(1);

    const templates = (await db.select().from(notifications)).map(
      (n) => n.template,
    );
    expect(templates).toContain("payment_confirmed");
    expect(templates).toContain("admin_payment_confirmed");
  });

  it("rejects unsigned or tampered webhooks", async () => {
    await createOrder(orderInput());
    const body = JSON.stringify({
      id: "evt_x",
      event: "payment.completed",
      created: 0,
      data: { transaction_id: "TXN_1", status: "completed" },
    });
    await expectRefused(
      handleElgioPayWebhook(body, undefined),
      "invalid_signature",
    );
    await expectRefused(
      handleElgioPayWebhook(body, signWebhook(body, "whsec_wrong")),
      "invalid_signature",
    );
    const [saved] = await db.select().from(orders);
    expect(saved!.status).toBe("pending_payment");
  });

  it("records failures and lets the customer retry", async () => {
    const order = await createOrder(orderInput());
    await webhook("payment.failed", "TXN_1", undefined, { error_code: 9202 });

    const [failed] = await db.select().from(payments);
    expect(failed).toMatchObject({ status: "failed", failureCode: "9202" });
    const view = await retryPayment(
      order.number,
      order.accessToken,
      "677000000",
    );
    expect(view.status).toBe("pending_payment");
    expect(view.payment).toMatchObject({
      status: "pending",
      phoneHint: "0000",
    });
    expect(initiate).toHaveBeenCalledTimes(2);

    await webhook("payment.completed", "TXN_2");
    const [saved] = await db.select().from(orders);
    expect(saved!.status).toBe("paid");
  });

  it("refuses retries with a wrong order token", async () => {
    const order = await createOrder(orderInput());
    await expectRefused(
      retryPayment(order.number, "x".repeat(32), null),
      "order_not_found",
    );
  });
});

describe("expirations", () => {
  it("releases stock when the payment window passes", async () => {
    await createOrder(orderInput());
    await db
      .update(reservations)
      .set({ expiresAt: new Date(Date.now() - 1000) });

    expect(await expireReservations()).toBe(1);
    expect((await variant("W01-MANY")).stockReserved).toBe(0);
    const [r] = await db.select().from(reservations);
    expect(r!.status).toBe("released");
  });

  it("still sells a released item if it is paid late and stock remains", async () => {
    await createOrder(orderInput());
    await db
      .update(reservations)
      .set({ expiresAt: new Date(Date.now() - 1000) });
    await expireReservations();

    await webhook("payment.completed", "TXN_1");
    const [saved] = await db.select().from(orders);
    expect(saved!.status).toBe("paid");
    expect((await variant("W01-MANY")).stockOnHand).toBe(4);
  });

  it("cancels orders left unpaid for 72 hours", async () => {
    await createOrder(orderInput());
    await db
      .update(orders)
      .set({ createdAt: new Date(Date.now() - 73 * 3_600_000) });

    expect(await cancelUnpaidOrders()).toBe(1);
    const [saved] = await db.select().from(orders);
    expect(saved!.status).toBe("cancelled");
    expect((await variant("W01-MANY")).stockReserved).toBe(0);

    // Paid after cancellation: kept cancelled, the founder is alerted.
    await webhook("payment.completed", "TXN_1");
    const templates = (await db.select().from(notifications)).map(
      (n) => n.template,
    );
    expect(templates).toContain("admin_late_payment");
  });
});

describe("payment status checks (polling ElgioPay)", () => {
  it("marks the order paid when ElgioPay reports the payment completed", async () => {
    await createOrder(orderInput());
    remoteStatus("completed");

    expect(await checkPendingPayments()).toBe(1);
    const [saved] = await db.select().from(orders);
    expect(saved!.status).toBe("paid");
    expect((await variant("W01-MANY")).stockOnHand).toBe(4);
    expect(getPayment).toHaveBeenCalledWith("TXN_1");
  });

  it("leaves pending payments alone and throttles checks", async () => {
    await createOrder(orderInput());
    remoteStatus("pending");

    const [payment] = await db.select().from(payments);
    expect(await checkPaymentStatus(payment!.id)).toBe("pending");
    expect(await checkPaymentStatus(payment!.id)).toBe("recently_checked");
    expect(getPayment).toHaveBeenCalledTimes(1);
    const [saved] = await db.select().from(orders);
    expect(saved!.status).toBe("pending_payment");
  });

  it("records failures reported by ElgioPay", async () => {
    await createOrder(orderInput());
    remoteStatus("failed", 106000, { error_code: 9201 });

    await checkPendingPayments();
    const [payment] = await db.select().from(payments);
    expect(payment).toMatchObject({ status: "failed", failureCode: "9201" });
  });

  it("stops checking a payment after 30 attempts", async () => {
    await createOrder(orderInput());
    remoteStatus("pending");
    const [payment] = await db.select().from(payments);

    for (let i = 0; i < MAX_STATUS_CHECKS; i++) {
      // Make every attempt due (the 10 s spacing is tested above).
      await db.update(payments).set({ lastCheckedAt: null });
      expect(await checkPaymentStatus(payment!.id)).toBe("pending");
    }
    await db.update(payments).set({ lastCheckedAt: null });
    expect(await checkPaymentStatus(payment!.id)).toBe("check_limit_reached");
    expect(await checkPendingPayments()).toBe(0);
    expect(getPayment).toHaveBeenCalledTimes(MAX_STATUS_CHECKS);
    const [saved] = await db.select().from(payments);
    expect(saved!.statusChecks).toBe(MAX_STATUS_CHECKS);
  });

  it("refuses to mark paid when the amount differs", async () => {
    await createOrder(orderInput());
    remoteStatus("completed", 1000);

    await checkPendingPayments();
    const [saved] = await db.select().from(orders);
    expect(saved!.status).toBe("pending_payment");
    const templates = (await db.select().from(notifications)).map(
      (n) => n.template,
    );
    expect(templates).toContain("admin_payment_mismatch");
  });

  it("does nothing more when the webhook already settled the payment", async () => {
    await createOrder(orderInput());
    await webhook("payment.completed", "TXN_1");
    remoteStatus("completed");

    expect(await checkPendingPayments()).toBe(0);
    expect(getPayment).not.toHaveBeenCalled();
    const sales = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, "sale"));
    expect(sales).toHaveLength(1);
  });
});
