import { Router } from "express";
import { z } from "zod";
import { getProduct, listProducts } from "../services/catalog.js";

const codeParam = z.object({
  code: z.string().regex(/^[a-z0-9-]{1,32}$/i),
});

export const productsRouter = Router();

productsRouter.get("/", async (_req, res) => {
  res.json(await listProducts());
});

productsRouter.get("/:code", async (req, res) => {
  const params = codeParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "invalid_product_code" });
    return;
  }
  const product = await getProduct(params.data.code);
  if (!product) {
    res.status(404).json({ error: "product_not_found" });
    return;
  }
  res.json(product);
});
