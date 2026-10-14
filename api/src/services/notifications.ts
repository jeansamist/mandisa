import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db, type Db } from "../db/client.js";
import { notifications } from "../db/schema.js";
import { env } from "../env.js";
import { loggableError, logger } from "../logger.js";

const log = logger.child({ module: "notifications" });

// WhatsApp messages go through an outbox: they are written in the same
// transaction as the order change, then sent (and retried) by a worker.

export type CustomerTemplate =
  | "order_received"
  | "quote_requested"
  | "payment_confirmed"
  | "payment_failed"
  | "order_cancelled";

export type AdminTemplate =
  | "admin_new_order"
  | "admin_quote_requested"
  | "admin_payment_review"
  | "admin_payment_confirmed"
  | "admin_stock_issue"
  | "admin_late_payment"
  | "admin_payment_mismatch"
  | "admin_ai_handoff"
  | "admin_contact_message";

/** A WhatsApp provider (BSP / Cloud API). Templates must be approved by Meta. */
export interface WhatsAppProvider {
  send(message: {
    to: string;
    template: string;
    locale: string;
    params: Record<string, string>;
  }): Promise<{ messageId: string }>;
}

/** Development provider: writes the message to the logs instead of sending it. */
const logProvider: WhatsAppProvider = {
  async send(message) {
    log.info(message, `whatsapp (not sent, log provider): ${message.template}`);
    return { messageId: `log-${Date.now()}` };
  },
};

const providers: Record<typeof env.NOTIFICATIONS_PROVIDER, WhatsAppProvider> = {
  log: logProvider,
};

export function orderLink(locale: string, number: string, accessToken: string) {
  const params = new URLSearchParams({ order: number, token: accessToken });
  return `${env.WEB_URL}/${locale}/order-confirmation?${params}`;
}

export async function notifyCustomer(
  tx: Db,
  n: {
    orderId: number;
    to: string;
    locale: string;
    template: CustomerTemplate;
    params: Record<string, string>;
  },
) {
  await tx.insert(notifications).values({ ...n, recipient: "customer" });
}

export async function notifyAdmin(
  tx: Db,
  n: {
    orderId: number | null;
    template: AdminTemplate;
    params: Record<string, string>;
  },
) {
  if (!env.ADMIN_WHATSAPP) {
    log.warn(
      { template: n.template },
      "ADMIN_WHATSAPP not set: admin alert skipped",
    );
    return;
  }
  await tx
    .insert(notifications)
    .values({ ...n, recipient: "admin", to: env.ADMIN_WHATSAPP, locale: "fr" });
}

const MAX_ATTEMPTS = 6;

/** Sends due notifications. Safe to run from several processes (SKIP LOCKED). */
export async function processOutbox(limit = 20) {
  const provider = providers[env.NOTIFICATIONS_PROVIDER];
  return db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.status, "pending"),
          lte(notifications.nextAttemptAt, new Date()),
        ),
      )
      .orderBy(asc(notifications.id))
      .limit(limit)
      .for("update", { skipLocked: true });

    for (const n of due) {
      try {
        const { messageId } = await provider.send({
          to: n.to,
          template: n.template,
          locale: n.locale,
          params: n.params,
        });
        await tx
          .update(notifications)
          .set({
            status: "sent",
            sentAt: new Date(),
            attempts: n.attempts + 1,
            providerMessageId: messageId,
          })
          .where(eq(notifications.id, n.id));
      } catch (err) {
        const attempts = n.attempts + 1;
        const failed = attempts >= MAX_ATTEMPTS;
        log.error(
          { err: loggableError(err), notificationId: n.id, attempts },
          failed
            ? "notification failed permanently"
            : "notification failed, will retry",
        );
        await tx
          .update(notifications)
          .set({
            attempts,
            status: failed ? "failed" : "pending",
            lastError: err instanceof Error ? err.message : String(err),
            // 1, 2, 4, 8, 16 minutes
            nextAttemptAt: sql`now() + make_interval(mins => ${2 ** (attempts - 1)})`,
          })
          .where(eq(notifications.id, n.id));
      }
    }
    return due.length;
  });
}
