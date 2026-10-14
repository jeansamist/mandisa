import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { orderInput, resetDatabase } from "../../test/fixtures.js";
import { db, pool } from "../db/client.js";
import {
  adminUsers,
  auditLog,
  contactMessages,
  notifications,
  stockMovements,
  variants,
} from "../db/schema.js";
import { elgiopay } from "../integrations/elgiopay.js";
import { CheckoutError } from "../services/errors.js";
import { submitContactMessage } from "../services/contact.js";
import { createOrder } from "../services/orders.js";
import { quoteCart } from "../services/quote.js";
import { login } from "./auth.js";
import { adminUpdateVariant } from "./catalog.js";
import { adminDashboard } from "./dashboard.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import {
  adminUpdateDeliveryMethod,
  adminUpdatePaymentMethod,
} from "./settings.js";
import { vi } from "vitest";

vi.spyOn(elgiopay, "initiatePayment").mockResolvedValue({
  transactionId: "TXN_A",
  status: "pending",
});

let adminId: number;

beforeEach(async () => {
  await resetDatabase();
  const [admin] = await db
    .insert(adminUsers)
    .values({
      email: "founder@mandisa.cm",
      name: "Founder",
      passwordHash: await hashPassword("correct horse"),
    })
    .returning();
  adminId = admin!.id;
});

afterAll(async () => {
  await pool.end();
});

async function expectRefused(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (err) => err instanceof CheckoutError && err.code === code,
  );
}

describe("admin login", () => {
  it("hashes passwords with scrypt", async () => {
    const hash = await hashPassword("secret");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("secret", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("logs in with the right password and audits it", async () => {
    const session = await login("Founder@Mandisa.cm ", "correct horse", null);
    expect(session.token.length).toBeGreaterThan(30);
    expect(session.admin.email).toBe("founder@mandisa.cm");
    const actions = (await db.select().from(auditLog)).map((a) => a.action);
    expect(actions).toContain("login");
  });

  it("gives the same error for an unknown email and a wrong password", async () => {
    await expectRefused(
      login("nobody@mandisa.cm", "x", null),
      "invalid_credentials",
    );
    await expectRefused(
      login("founder@mandisa.cm", "x", null),
      "invalid_credentials",
    );
  });

  it("locks the account after 5 failures", async () => {
    for (let i = 0; i < 5; i++) {
      await expectRefused(
        login("founder@mandisa.cm", "nope", null),
        "invalid_credentials",
      );
    }
    await expectRefused(
      login("founder@mandisa.cm", "correct horse", null),
      "too_many_attempts",
    );
  });
});

describe("catalog management", () => {
  it("journals stock changes and audits price edits", async () => {
    await adminUpdateVariant(adminId, "W01-MANY", {
      priceXaf: 110000,
      lowStockThreshold: 2,
      preorderEnabled: false,
      stockOnHand: 8,
      stockReason: "entry",
      stockNote: "delivery from supplier",
    });
    const [v] = await db
      .select()
      .from(variants)
      .where(eq(variants.sku, "W01-MANY"));
    expect(v).toMatchObject({ priceXaf: 110000, stockOnHand: 8 });
    const [movement] = await db.select().from(stockMovements);
    expect(movement).toMatchObject({
      type: "entry",
      quantity: 3,
      note: "delivery from supplier",
    });
    const [entry] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "variant_updated"));
    expect(entry!.data).toMatchObject({
      before: { priceXaf: 106000 },
      after: { priceXaf: 110000 },
    });
  });

  it("refuses stock below what open orders have reserved", async () => {
    await createOrder(orderInput());
    await expect(
      adminUpdateVariant(adminId, "W01-MANY", {
        priceXaf: 106000,
        lowStockThreshold: 2,
        preorderEnabled: false,
        stockOnHand: 0,
        stockReason: "correction",
      }),
    ).rejects.toSatisfy(
      (err) =>
        err instanceof CheckoutError && err.code === "stock_below_reserved",
    );
  });
});

describe("shipping and payment settings", () => {
  it("changes the fees and methods the checkout uses", async () => {
    await adminUpdateDeliveryMethod(adminId, "douala_home", {
      feeXaf: 1500,
      allowsCashOnDelivery: false,
      requiresAddress: true,
      isActive: true,
      position: 0,
    });
    await adminUpdatePaymentMethod(adminId, "bank_transfer", {
      isActive: false,
      position: 2,
    });

    const quote = await quoteCart({
      cart: [{ sku: "W01-MANY", quantity: 1 }],
      deliveryMethod: "douala_home",
    });
    expect(quote.deliveryFeeXaf).toBe(1500);
    expect(quote.paymentMethods).toEqual(["mtn_momo", "orange_money"]);
  });
});

describe("contact form", () => {
  it("saves the message and alerts the founder", async () => {
    await submitContactMessage({
      name: "Awa",
      phone: "699 00 00 00",
      message: "Bonjour !",
      locale: "fr",
    });
    const [saved] = await db.select().from(contactMessages);
    expect(saved).toMatchObject({ phone: "+237699000000", status: "new" });
    const templates = (await db.select().from(notifications)).map(
      (n) => n.template,
    );
    expect(templates).toEqual(["admin_contact_message"]);
  });
});

describe("dashboard", () => {
  it("computes metrics, to-dos and recent activity", async () => {
    await createOrder(orderInput());
    await submitContactMessage({
      name: "Awa",
      phone: "699000000",
      message: "Hi",
      locale: "en",
    });
    const dashboard = await adminDashboard();
    expect(dashboard.kpis.orders).toBe(1);
    expect(dashboard.todo).toMatchObject({ unpaidOrders: 1, newMessages: 1 });
    expect(dashboard.daily).toHaveLength(14);
    expect(dashboard.recent.orders).toHaveLength(1);
    expect(dashboard.lowStock.map((v) => v.sku)).toContain("W01-LAST");
  });
});
