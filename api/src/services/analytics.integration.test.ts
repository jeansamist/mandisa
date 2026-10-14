import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../../test/fixtures.js";
import { db, pool } from "../db/client.js";
import { analyticsEvents, analyticsSessions } from "../db/schema.js";
import { batchSchema, ingestBatch } from "./analytics.js";

const visitorId = crypto.randomUUID();
const sessionId = crypto.randomUUID();

function batch(
  events: {
    type: string;
    path: string;
    ts?: number;
    props?: Record<string, string | number>;
  }[],
  overrides = {},
) {
  return batchSchema.parse({
    visitorId,
    sessionId,
    context: {
      locale: "fr",
      landingPath: "/fr",
      device: "mobile",
      utm: { utm_source: "instagram" },
    },
    events: events.map((e) => ({ ts: Date.now(), ...e })),
    ...overrides,
  });
}

beforeEach(async () => {
  await resetDatabase();
  await db.delete(analyticsEvents);
  await db.delete(analyticsSessions);
});

afterAll(async () => {
  await pool.end();
});

describe("analytics ingestion", () => {
  it("stores the journey and keeps session counters", async () => {
    await ingestBatch(
      batch([
        { type: "page_view", path: "/fr" },
        {
          type: "click",
          path: "/fr",
          props: { label: "Découvrir la collection", tag: "button" },
        },
      ]),
      "Mozilla/5.0 (iPhone)",
    );
    await ingestBatch(batch([{ type: "page_view", path: "/fr/shop" }]), null);

    const [session] = await db.select().from(analyticsSessions);
    expect(session).toMatchObject({
      visitorId,
      landingPath: "/fr",
      device: "mobile",
      pageViews: 2,
      clicks: 1,
      utm: { utm_source: "instagram" },
    });
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.sessionId, sessionId));
    expect(events.map((e) => [e.type, e.path])).toEqual([
      ["page_view", "/fr"],
      ["click", "/fr"],
      ["page_view", "/fr/shop"],
    ]);
  });

  it("clamps browser clocks that are far off", async () => {
    await ingestBatch(
      batch([
        { type: "page_view", path: "/fr", ts: Date.now() + 10 * 86_400_000 },
      ]),
      null,
    );
    const [event] = await db.select().from(analyticsEvents);
    expect(event!.occurredAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("refuses to append to another visitor's session", async () => {
    await ingestBatch(batch([{ type: "page_view", path: "/fr" }]), null);
    const stored = await ingestBatch(
      batch([{ type: "click", path: "/fr" }], {
        visitorId: crypto.randomUUID(),
      }),
      null,
    );
    expect(stored).toBe(0);
    expect(await db.select().from(analyticsEvents)).toHaveLength(1);
  });

  it("rejects malformed batches", () => {
    expect(() => batch([{ type: "Not Snake", path: "/fr" }])).toThrow();
    expect(() => batch([])).toThrow();
    expect(() =>
      batch(Array.from({ length: 51 }, () => ({ type: "click", path: "/fr" }))),
    ).toThrow();
  });
});
