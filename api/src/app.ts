import express, { type ErrorRequestHandler } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db/client.js";
import { productsRouter } from "./routes/products.js";
import { listSiteImages } from "./services/site-images.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    await db.execute(sql`select 1`);
    res.json({ status: "ok" });
  });

  app.use("/products", productsRouter);

  app.get("/site-images", async (_req, res) => {
    res.json(await listSiteImages());
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    console.error(
      JSON.stringify({
        level: "error",
        method: req.method,
        path: req.path,
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    res.status(500).json({ error: "internal_error" });
  };
  app.use(onError);

  return app;
}
