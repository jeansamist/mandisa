import { randomUUID } from "node:crypto";
import express, { type ErrorRequestHandler } from "express";
import { sql } from "drizzle-orm";
import { pinoHttp } from "pino-http";
import { db } from "./db/client.js";
import { loggableError, logger } from "./logger.js";
import { productsRouter } from "./routes/products.js";
import { listSiteImages } from "./services/site-images.js";

// Inside routers `req.url` is relative to the mount point; Express keeps the original.
function fullUrl(req: { url?: string; originalUrl?: string }) {
  return req.originalUrl ?? req.url;
}

export function createApp() {
  const app = express();
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
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    await db.execute(sql`select 1`);
    res.json({ status: "ok" });
  });

  app.use("/products", productsRouter);

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
    // pino-http logs it once, on the request summary line.
    res.err = loggableError(err) as Error;
    res.status(500).json({ error: "internal_error" });
  };
  app.use(onError);

  return app;
}
