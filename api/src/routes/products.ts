import { Router } from "express";
import { z } from "zod";
import { getProduct, listProducts } from "../services/catalog.js";

const codeParam = z.object({
  code: z.string().regex(/^[a-z0-9-]{1,32}$/i),
});

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  const products = await listProducts();
  req.log.debug({ count: products.length }, "products listed");
  res.json(products);
});

productsRouter.get("/:code", async (req, res) => {
  const params = codeParam.safeParse(req.params);
  if (!params.success) {
    req.log.warn({ code: req.params.code }, "invalid product code");
    res.status(400).json({ error: "invalid_product_code" });
    return;
  }
  const product = await getProduct(params.data.code);
  if (!product) {
    req.log.info({ code: params.data.code }, "product not found");
    res.status(404).json({ error: "product_not_found" });
    return;
  }
  req.log.debug(
    { code: product.code, status: product.status },
    "product fetched",
  );
  res.json(product);
});
