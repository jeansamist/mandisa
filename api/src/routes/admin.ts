import { Router } from "express";
import { z } from "zod";
import {
  adminGetAssistantConfig,
  adminGetConversation,
  adminListConversations,
  adminUpdateAssistantConfig,
} from "../admin/assistant.js";
import { login, logout, requireAdmin } from "../admin/auth.js";
import {
  adminAddMedia,
  adminCreateProduct,
  adminCreateVariant,
  adminDeleteMedia,
  adminGetProduct,
  adminListProducts,
  adminUpdateMedia,
  adminUpdateProduct,
  adminUpdateVariant,
  createProductSchema,
  createVariantSchema,
  mediaInputSchema,
  productInputSchema,
  updateMediaSchema,
  updateVariantSchema,
} from "../admin/catalog.js";
import { adminDashboard } from "../admin/dashboard.js";
import {
  adminCheckoutSettings,
  adminCreateDeliveryMethod,
  adminUpdateDeliveryMethod,
  adminUpdatePaymentMethod,
  createDeliveryMethodSchema,
  deliveryMethodSchema,
  paymentMethodSchema,
} from "../admin/settings.js";
import { updateConfigSchema } from "../services/assistant/config.js";
import {
  adminListContactMessages,
  adminSetContactStatus,
} from "../services/contact.js";

export const adminRouter = Router();

const id = z.coerce.number().int().positive();
const adminId = (req: { admin?: { id: number } }) => req.admin!.id;

// --- Authentication ---------------------------------------------------------

adminRouter.post("/auth/login", async (req, res) => {
  const body = z
    .object({
      email: z.string().trim().email().max(200),
      password: z.string().min(1).max(200),
    })
    .parse(req.body);
  res.json(
    await login(
      body.email,
      body.password,
      req.header("x-client-user-agent") ?? null,
    ),
  );
});

// Everything below requires an admin session.
adminRouter.use(requireAdmin);

adminRouter.get("/auth/me", (req, res) => {
  res.json({ admin: req.admin });
});

adminRouter.post("/auth/logout", async (req, res) => {
  await logout(req.header("x-admin-session")!, adminId(req));
  res.status(204).end();
});

// --- Dashboard --------------------------------------------------------------

adminRouter.get("/dashboard", async (_req, res) => {
  res.json(await adminDashboard());
});

// --- Catalog ----------------------------------------------------------------

adminRouter.get("/products", async (_req, res) => {
  res.json(await adminListProducts());
});

adminRouter.post("/products", async (req, res) => {
  res
    .status(201)
    .json(
      await adminCreateProduct(
        adminId(req),
        createProductSchema.parse(req.body),
      ),
    );
});

adminRouter.get("/products/:code", async (req, res) => {
  res.json(await adminGetProduct(String(req.params.code)));
});

adminRouter.put("/products/:code", async (req, res) => {
  await adminUpdateProduct(
    adminId(req),
    String(req.params.code),
    productInputSchema.parse(req.body),
  );
  res.status(204).end();
});

adminRouter.post("/products/:code/variants", async (req, res) => {
  res
    .status(201)
    .json(
      await adminCreateVariant(
        adminId(req),
        String(req.params.code),
        createVariantSchema.parse(req.body),
      ),
    );
});

adminRouter.put("/variants/:sku", async (req, res) => {
  await adminUpdateVariant(
    adminId(req),
    String(req.params.sku),
    updateVariantSchema.parse(req.body),
  );
  res.status(204).end();
});

adminRouter.post("/products/:code/media", async (req, res) => {
  res
    .status(201)
    .json(
      await adminAddMedia(
        adminId(req),
        String(req.params.code),
        mediaInputSchema.parse(req.body),
      ),
    );
});

adminRouter.put("/media/:id", async (req, res) => {
  await adminUpdateMedia(
    adminId(req),
    id.parse(req.params.id),
    updateMediaSchema.parse(req.body),
  );
  res.status(204).end();
});

adminRouter.delete("/media/:id", async (req, res) => {
  await adminDeleteMedia(adminId(req), id.parse(req.params.id));
  res.status(204).end();
});

// --- Shipping & payments ----------------------------------------------------

adminRouter.get("/checkout-settings", async (_req, res) => {
  res.json(await adminCheckoutSettings());
});

adminRouter.post("/delivery-methods", async (req, res) => {
  await adminCreateDeliveryMethod(
    adminId(req),
    createDeliveryMethodSchema.parse(req.body),
  );
  res.status(201).end();
});

adminRouter.put("/delivery-methods/:code", async (req, res) => {
  await adminUpdateDeliveryMethod(
    adminId(req),
    String(req.params.code),
    deliveryMethodSchema.parse(req.body),
  );
  res.status(204).end();
});

adminRouter.put("/payment-methods/:code", async (req, res) => {
  await adminUpdatePaymentMethod(
    adminId(req),
    String(req.params.code),
    paymentMethodSchema.parse(req.body),
  );
  res.status(204).end();
});

// --- AI assistant -----------------------------------------------------------

adminRouter.get("/assistant/config", async (_req, res) => {
  res.json(await adminGetAssistantConfig());
});

adminRouter.put("/assistant/config", async (req, res) => {
  await adminUpdateAssistantConfig(
    adminId(req),
    updateConfigSchema.parse(req.body),
  );
  res.status(204).end();
});

adminRouter.get("/assistant/conversations", async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      status: z.enum(["open", "handed_off"]).optional(),
    })
    .parse(req.query);
  res.json(await adminListConversations(query.page, query.status));
});

adminRouter.get("/assistant/conversations/:id", async (req, res) => {
  res.json(await adminGetConversation(z.string().uuid().parse(req.params.id)));
});

// --- Contact messages -------------------------------------------------------

adminRouter.get("/messages", async (req, res) => {
  const status = z
    .enum(["new", "read", "archived"])
    .optional()
    .parse(req.query.status);
  res.json(await adminListContactMessages(status));
});

adminRouter.put("/messages/:id", async (req, res) => {
  const body = z
    .object({ status: z.enum(["new", "read", "archived"]) })
    .parse(req.body);
  await adminSetContactStatus(
    adminId(req),
    id.parse(req.params.id),
    body.status,
  );
  res.status(204).end();
});
