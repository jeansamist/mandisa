import { Router } from "express";
import { batchSchema, ingestBatch } from "../services/analytics.js";

export const analyticsRouter = Router();

// Called by the web server's /api/track route, which relays the browser tracker.
analyticsRouter.post("/events", async (req, res) => {
  const batch = batchSchema.parse(req.body);
  await ingestBatch(batch, req.header("x-client-user-agent") ?? null);
  res.status(204).end();
});
