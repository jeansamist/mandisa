import { randomUUID } from "node:crypto";
import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import { sql } from "drizzle-orm";
import { pinoHttp } from "pino-http";
import { db } from "../db/client.js";
import { loggableError, logger } from "../logger.js";
import { ZodError } from "zod";
import { sendNotificationsAfterResponse } from "./background.js";
import { requireInternalKey } from "./internal-key.js";
import { cronRouter } from "../routes/cron.js";
import { adminRouter } from "../routes/admin.js";
import { analyticsRouter } from "../routes/analytics.js";
import { publicRouter } from "../routes/public.js";
import { checkoutRouter } from "../routes/checkout.js";
import { ordersRouter } from "../routes/orders.js";
import { productsRouter } from "../routes/products.js";
import { webhooksRouter } from "../routes/webhooks.js";
import { CheckoutError } from "../services/errors.js";
import { listSiteImages } from "../services/site-images.js";

// Inside routers `req.url` is relative to the mount point; Express keeps the original.
function fullUrl(req: { url?: string; originalUrl?: string }) {
  return req.originalUrl ?? req.url;
}

/** Configures the API on an Express instance (the entry file creates it, as Vercel requires). */
export function createApp(app: Express = express()) {
  app.disable("x-powered-by");

  // One log line per request, with an id shared by every log of that request.
  app.use(
    pinoHttp({
      logger,
      // Logs written through req.log carry only the request id, not the whole request.
      quietReqLogger: true,
      genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id =
          typeof incoming === "string" && /^[\w-]{1,128}$/.test(incoming)
            ? incoming
            : randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        // Health checks are frequent and uninteresting when they succeed.
        return req.url === "/health" ? "debug" : "info";
      },
      customSuccessMessage: (req, res, responseTime) =>
        `${req.method} ${fullUrl(req)} ${res.statusCode} ${Math.round(responseTime)}ms`,
      customErrorMessage: (req, res) =>
        `${req.method} ${fullUrl(req)} ${res.statusCode} failed`,
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  // Any origin may call the API (no cookies are used). Protected routes still
  // require x-internal-key; preflights are answered here, before that check.
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "content-type",
        "x-internal-key",
        "x-admin-session",
        "x-order-token",
        "x-request-id",
        "x-client-user-agent",
      ],
      exposedHeaders: ["x-request-id"],
      maxAge: 86400,
    }),
  );

  app.get("/health", async (_req, res) => {
    await db.execute(sql`select 1`);
    res.json({ status: "ok" });
  });

  // Called by ElgioPay (signed), before the JSON parser: it needs the raw body.
  app.use("/webhooks", sendNotificationsAfterResponse, webhooksRouter);
  // Scheduled maintenance (Vercel Cron, own secret).
  app.use("/cron", cronRouter);

  app.use(express.json({ limit: "100kb" }));
  app.use(requireInternalKey);

  app.use("/products", productsRouter);
  app.use("/checkout", checkoutRouter);
  app.use("/orders", sendNotificationsAfterResponse, ordersRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/admin", adminRouter);
  app.use(sendNotificationsAfterResponse, publicRouter);

  app.get("/site-images", async (req, res) => {
    const images = await listSiteImages();
    req.log.debug({ count: Object.keys(images).length }, "site images listed");
    res.json(images);
  });

  app.use((req, res) => {
    req.log.warn({ url: req.originalUrl }, "route not found");
    res.status(404).json({ error: "not_found" });
  });

  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    if (err instanceof CheckoutError) {
      req.log.info({ code: err.code, details: err.details }, "request refused");
      res
        .status(err.httpStatus)
        .json({ error: err.code, details: err.details });
      return;
    }
    if (err instanceof ZodError) {
      req.log.info({ issues: err.issues }, "invalid request");
      res.status(400).json({ error: "invalid_request", details: err.issues });
      return;
    }
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "invalid_json" });
      return;
    }
    // pino-http logs it once, on the request summary line.
    res.err = loggableError(err) as Error;
    res.status(500).json({ error: "internal_error" });
  };
  app.use(onError);

  return app;
}
