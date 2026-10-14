import express, { Router } from "express";
import { handleElgioPayWebhook } from "../services/payment-webhooks.js";

export const webhooksRouter = Router();

// Raw body: the signature is computed over the exact bytes received.
webhooksRouter.post(
  "/elgiopay",
  express.raw({ type: "*/*", limit: "1mb" }),
  async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const result = await handleElgioPayWebhook(
      rawBody,
      req.header("x-elgiopay-signature"),
    );
    req.log.info(
      { eventId: req.header("x-elgiopay-event-id"), result },
      "elgiopay webhook handled",
    );
    res.status(200).json({ received: true });
  },
);
