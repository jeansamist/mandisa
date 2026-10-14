import { db } from "../db/client.js";
import { siteImages } from "../db/schema.js";

/** All marketing images as a `{ key: url }` map. */
export async function listSiteImages(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteImages);
  return Object.fromEntries(rows.map((r) => [r.key, r.url]));
}
