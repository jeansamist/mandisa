import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../env.js";

/** Only the web server (which holds INTERNAL_API_KEY) may call the API. */
export const requireInternalKey: RequestHandler = (req, res, next) => {
  const given = Buffer.from(req.header("x-internal-key") ?? "");
  const expected = Buffer.from(env.INTERNAL_API_KEY);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    req.log.warn("rejected request: missing or invalid internal key");
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
};
