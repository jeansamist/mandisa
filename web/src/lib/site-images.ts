import type { Texture } from "@/lib/catalog";

// Keys of the `site_images` table (seeded in api/src/db/seed.ts).
export type SiteImageKey =
  | "hero"
  | `texture.${Texture}`
  | "careBanner"
  | "info.care"
  | "info.delivery"
  | "info.about";
