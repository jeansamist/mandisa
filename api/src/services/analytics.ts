import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { analyticsEvents, analyticsSessions } from "../db/schema.js";
import { logger } from "../logger.js";

const log = logger.child({ module: "analytics" });

const shortText = (max: number) => z.string().max(max);

// Small, flat property bags only: no nested objects, bounded strings.
const props = z
  .record(
    z.string().max(40),
    z.union([shortText(500), z.number(), z.boolean(), z.null()]),
  )
  .refine((p) => Object.keys(p).length <= 30, "too many properties");

const eventSchema = z.object({
  type: z
    .string()
    .regex(/^[a-z][a-z0-9_]{1,39}$/, "event names are snake_case"),
  path: shortText(500),
  /** Browser timestamp in ms. */
  ts: z.number().int().positive(),
  props: props.optional(),
});

export const batchSchema = z.object({
  visitorId: z.string().uuid(),
  sessionId: z.string().uuid(),
  context: z
    .object({
      locale: shortText(10).nullish(),
      referrer: shortText(500).nullish(),
      landingPath: shortText(500).nullish(),
      utm: z.record(z.string().max(20), shortText(200)).nullish(),
      device: z.enum(["mobile", "tablet", "desktop"]).nullish(),
    })
    .optional(),
  events: z.array(eventSchema).min(1).max(50),
});
export type AnalyticsBatch = z.infer<typeof batchSchema>;

const MAX_SKEW_MS = 24 * 3_600_000;

/** Browser clocks can be wrong: keep event times within a day of now. */
function clampTime(ts: number, now: number) {
  return new Date(Math.min(now, Math.max(now - MAX_SKEW_MS, ts)));
}

/** Stores a batch of journey events sent by the browser tracker. */
export async function ingestBatch(
  batch: AnalyticsBatch,
  userAgent: string | null,
) {
  const now = Date.now();
  const events = batch.events.map((e) => ({
    sessionId: batch.sessionId,
    visitorId: batch.visitorId,
    type: e.type,
    path: e.path,
    data: e.props ?? null,
    occurredAt: clampTime(e.ts, now),
  }));
  const first = events.reduce((a, b) => (a.occurredAt < b.occurredAt ? a : b));
  const last = events.reduce((a, b) => (a.occurredAt > b.occurredAt ? a : b));
  const pageViews = events.filter((e) => e.type === "page_view").length;
  const clicks = events.filter((e) => e.type === "click").length;
  const ctx = batch.context;

  const stored = await db.transaction(async (tx) => {
    const upserted = await tx
      .insert(analyticsSessions)
      .values({
        id: batch.sessionId,
        visitorId: batch.visitorId,
        startedAt: first.occurredAt,
        lastSeenAt: last.occurredAt,
        landingPath: ctx?.landingPath ?? first.path,
        referrer: ctx?.referrer ?? null,
        utm: ctx?.utm ?? null,
        locale: ctx?.locale ?? null,
        device: ctx?.device ?? null,
        userAgent: userAgent?.slice(0, 300) ?? null,
        pageViews,
        clicks,
      })
      .onConflictDoUpdate({
        target: analyticsSessions.id,
        set: {
          lastSeenAt: sql`greatest(${analyticsSessions.lastSeenAt}, ${last.occurredAt.toISOString()}::timestamptz)`,
          pageViews: sql`${analyticsSessions.pageViews} + ${pageViews}`,
          clicks: sql`${analyticsSessions.clicks} + ${clicks}`,
        },
        // A session id belongs to one visitor: never let another visitor append to it.
        setWhere: sql`${analyticsSessions.visitorId} = ${batch.visitorId}`,
      })
      .returning({ id: analyticsSessions.id });
    if (upserted.length === 0) return false;
    await tx.insert(analyticsEvents).values(events);
    return true;
  });

  if (!stored) {
    log.warn(
      { sessionId: batch.sessionId },
      "analytics batch rejected: session belongs to another visitor",
    );
    return 0;
  }

  log.debug(
    { sessionId: batch.sessionId, events: events.length, pageViews, clicks },
    "analytics batch stored",
  );
  return events.length;
}
