import { Router } from "express";
import { z } from "zod";
import {
  createOrder,
  createOrderSchema,
  getOrderForCustomer,
  retryPayment,
} from "../services/orders.js";

export const ordersRouter = Router();

const orderNumber = z.string().regex(/^MDS-\d{4}-\d{4,}$/);
// The order token travels in a header, never in the URL (URLs end up in logs).
const orderToken = z.string().min(16).max(100);

ordersRouter.post("/", async (req, res) => {
  const result = await createOrder(createOrderSchema.parse(req.body));
  res.status(result.replayed ? 200 : 201).json(result);
});

ordersRouter.get("/:number", async (req, res) => {
  res.json(
    await getOrderForCustomer(
      orderNumber.parse(req.params.number),
      orderToken.parse(req.header("x-order-token")),
    ),
  );
});

ordersRouter.post("/:number/payments", async (req, res) => {
  const body = z
    .object({ phone: z.string().max(30).nullish() })
    .parse(req.body ?? {});
  res
    .status(201)
    .json(
      await retryPayment(
        orderNumber.parse(req.params.number),
        orderToken.parse(req.header("x-order-token")),
        body.phone,
      ),
    );
});
