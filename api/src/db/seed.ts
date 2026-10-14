// Development seed: the 9 wigs from the design, with placeholder prices, stock and copy.
// Idempotent: re-running it resets these products' variants and media.
import { eq } from "drizzle-orm";
import { db, pool } from "./client.js";
import { productMedia, products, siteImages, variants } from "./schema.js";

type Texture = (typeof products.$inferInsert)["texture"];
type Scenario = "inStock" | "lowStock" | "preorder" | "soldOut";

const photos = {
  hero: "https://images.unsplash.com/photo-1632765854612-9b02b6ec2b15?auto=format&fit=crop&w=1600&q=88",
  afro: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=86",
  kinky:
    "https://images.unsplash.com/photo-1606418578110-c40f5d299c24?auto=format&fit=crop&w=900&q=86",
  yaki: "https://images.unsplash.com/photo-1527203561188-dae1bc1a417f?auto=format&fit=crop&w=900&q=86",
  curly:
    "https://images.unsplash.com/photo-1656473031961-9d5d9ee19f40?auto=format&fit=crop&w=900&q=86",
  detail:
    "https://images.unsplash.com/photo-1632765866070-3fadf25d3d5b?auto=format&fit=crop&w=900&q=86",
  care: "https://images.unsplash.com/photo-1595387644896-3d2d8e88b36e?auto=format&fit=crop&w=1200&q=86",
};

// Keys are referenced by the web app (web/src/lib/site-images.ts).
const siteImageUrls: Record<string, string> = {
  hero: photos.hero,
  "texture.afro": photos.afro,
  "texture.kinkyYaki": photos.kinky,
  "texture.lightYaki": photos.yaki,
  "texture.curly": photos.curly,
  careBanner: photos.care,
  "info.care": photos.care,
  "info.delivery": photos.detail,
  "info.about": photos.hero,
};

const descriptions: Record<Texture, { fr: string; en: string }> = {
  afro: {
    fr: "Une perruque afro au volume généreux, pensée pour sublimer votre texture naturelle. Prête à porter, avec ses accessoires offerts.",
    en: "An afro wig with generous volume, designed to enhance your natural texture. Ready to wear, with its accessories included.",
  },
  kinkyYaki: {
    fr: "Une texture crépue lissée, souple et naturelle, qui se fond avec vos cheveux. Prête à porter, avec ses accessoires offerts.",
    en: "A smoothed coily texture, soft and natural, that blends with your own hair. Ready to wear, with its accessories included.",
  },
  lightYaki: {
    fr: "Un yaki léger, doux et fluide, pour un rendu lisse et naturel. Prête à porter, avec ses accessoires offerts.",
    en: "A light, soft and flowing yaki for a smooth, natural finish. Ready to wear, with its accessories included.",
  },
  curly: {
    fr: "Des boucles définies, pleines de mouvement, pour un rendu vivant et naturel. Prête à porter, avec ses accessoires offerts.",
    en: "Defined curls full of movement, for a lively, natural look. Ready to wear, with its accessories included.",
  },
};

const catalog: {
  code: string;
  name: string;
  texture: Texture;
  basePriceXaf: number;
  scenario: Scenario;
  image: string;
}[] = [
  {
    code: "MDS-W01",
    name: "Nadège",
    texture: "afro",
    basePriceXaf: 98000,
    scenario: "inStock",
    image: photos.afro,
  },
  {
    code: "MDS-W02",
    name: "Mireille",
    texture: "kinkyYaki",
    basePriceXaf: 112000,
    scenario: "lowStock",
    image: photos.kinky,
  },
  {
    code: "MDS-W03",
    name: "Armelle",
    texture: "lightYaki",
    basePriceXaf: 84000,
    scenario: "preorder",
    image: photos.yaki,
  },
  {
    code: "MDS-W04",
    name: "Syntiche",
    texture: "curly",
    basePriceXaf: 128000,
    scenario: "inStock",
    image: photos.curly,
  },
  {
    code: "MDS-W05",
    name: "Estelle",
    texture: "afro",
    basePriceXaf: 76000,
    scenario: "inStock",
    image: photos.detail,
  },
  {
    code: "MDS-W06",
    name: "Laure",
    texture: "kinkyYaki",
    basePriceXaf: 142000,
    scenario: "preorder",
    image: photos.hero,
  },
  {
    code: "MDS-W07",
    name: "Flora",
    texture: "lightYaki",
    basePriceXaf: 92000,
    scenario: "inStock",
    image: photos.yaki,
  },
  {
    code: "MDS-W08",
    name: "Sandrine",
    texture: "curly",
    basePriceXaf: 135000,
    scenario: "lowStock",
    image: photos.curly,
  },
  {
    code: "MDS-W09",
    name: "Ngono",
    texture: "afro",
    basePriceXaf: 69000,
    scenario: "soldOut",
    image: photos.afro,
  },
];

const lengths = [12, 14, 16, 18];
const capSizes = ["S", "M", "L"] as const;
const color = { key: "naturalBlack", sku: "NB" };

/** Stock per variant so each product shows the status from the design. */
function stockFor(scenario: Scenario, length: number, capSize: string) {
  const isMain = length === 14 && capSize === "M";
  switch (scenario) {
    case "inStock":
      return { stockOnHand: capSize === "M" ? 3 : 0, preorderEnabled: true };
    case "lowStock":
      return { stockOnHand: isMain ? 2 : 0, preorderEnabled: false };
    case "preorder":
      return { stockOnHand: 0, preorderEnabled: true };
    case "soldOut":
      return { stockOnHand: 0, preorderEnabled: false };
  }
}

async function seed() {
  await db.transaction(async (tx) => {
    for (const p of catalog) {
      const [product] = await tx
        .insert(products)
        .values({
          code: p.code,
          name: p.name,
          texture: p.texture,
          descriptionFr: descriptions[p.texture].fr,
          descriptionEn: descriptions[p.texture].en,
        })
        .onConflictDoUpdate({
          target: products.code,
          set: {
            name: p.name,
            texture: p.texture,
            descriptionFr: descriptions[p.texture].fr,
            descriptionEn: descriptions[p.texture].en,
            isActive: true,
          },
        })
        .returning({ id: products.id });
      const productId = product!.id;

      await tx.delete(variants).where(eq(variants.productId, productId));
      await tx.insert(variants).values(
        lengths.flatMap((length, i) =>
          capSizes.map((capSize) => ({
            productId,
            sku: `${p.code}-${length}-${color.sku}-${capSize}`,
            lengthInches: length,
            color: color.key,
            capSize,
            // 12" and 14" share the base price shown in the design; longer lengths cost more.
            priceXaf: p.basePriceXaf + Math.max(0, i - 1) * 8000,
            ...stockFor(p.scenario, length, capSize),
          })),
        ),
      );

      await tx
        .delete(productMedia)
        .where(eq(productMedia.productId, productId));
      // Main photo first, then the gallery shots from the design.
      await tx.insert(productMedia).values(
        [p.image, photos.detail, photos.hero, photos.kinky].map(
          (url, position) => ({
            productId,
            url,
            position,
            approved: true,
          }),
        ),
      );
    }

    for (const [key, url] of Object.entries(siteImageUrls)) {
      await tx
        .insert(siteImages)
        .values({ key, url })
        .onConflictDoUpdate({
          target: siteImages.key,
          set: { url, updatedAt: new Date() },
        });
    }
  });
  console.log(
    `Seeded ${catalog.length} products and ${Object.keys(siteImageUrls).length} site images.`,
  );
}

seed()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
