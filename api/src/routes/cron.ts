import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { env } from "../env.js";
import { cancelUnpaidOrders, expireReservations } from "../jobs/index.js";
import { processOutbox } from "../services/notifications.js";
import { checkPendingPayments } from "../services/payment-status-check.js";

// Scheduled maintenance for serverless hosting (Vercel Cron Jobs call GET with
// "Authorization: Bearer <CRON_SECRET>"). Every job is idempotent, so a missed
// or duplicated run is harmless.
export const cronRouter = Router();

cronRouter.get("/maintenance", async (req, res) => {
  if (!env.CRON_SECRET) {
    res.status(503).json({ error: "cron_not_configured" });
    return;
  }
  const given = Buffer.from(req.header("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    req.log.warn("rejected cron call: bad secret");
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const result = {
    reservationsExpired: await expireReservations(),
    ordersCancelled: await cancelUnpaidOrders(),
    paymentsSettled: await checkPendingPayments(),
    notificationsSent: await processOutbox(),
  };
  req.log.info(result, "maintenance done");
  res.json(result);
});
