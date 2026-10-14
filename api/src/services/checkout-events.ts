import type { Db } from "../db/client.js";
import { checkoutEvents } from "../db/schema.js";
import { logger } from "../logger.js";

const log = logger.child({ module: "checkout" });

/** Saves one step of the checkout / order timeline, and logs it. */
export async function recordEvent(
  db: Db,
  event: {
    sessionId?: string | null;
    orderId?: number | null;
    type: string;
    data?: Record<string, unknown>;
  },
) {
  await db.insert(checkoutEvents).values({
    sessionId: event.sessionId ?? null,
    orderId: event.orderId ?? null,
    type: event.type,
    data: event.data ?? null,
  });
  log.info(
    { sessionId: event.sessionId, orderId: event.orderId, ...event.data },
    `checkout: ${event.type}`,
  );
}
