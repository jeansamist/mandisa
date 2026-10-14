import { Router } from "express";
import { z } from "zod";
import {
  sessionEventSchema,
  startCheckoutSession,
  startSessionSchema,
  trackCheckoutEvent,
} from "../services/checkout-sessions.js";
import { quoteCart, quoteSchema } from "../services/quote.js";

export const checkoutRouter = Router();

checkoutRouter.post("/quote", async (req, res) => {
  res.json(await quoteCart(quoteSchema.parse(req.body)));
});

checkoutRouter.post("/sessions", async (req, res) => {
  res
    .status(201)
    .json(await startCheckoutSession(startSessionSchema.parse(req.body)));
});

checkoutRouter.post("/sessions/:id/events", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  await trackCheckoutEvent(id, sessionEventSchema.parse(req.body));
  res.status(204).end();
});
