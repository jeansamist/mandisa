import { and, asc, eq, gt, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { payments } from "../db/schema.js";
import { elgiopay } from "../integrations/elgiopay.js";
import { loggableError, logger } from "../logger.js";
import { settlePayment } from "./payment-webhooks.js";

const log = logger.child({ module: "payments" });

/** How long a pending payment keeps being checked with ElgioPay. */
const CHECK_WINDOW_MS = 24 * 3_600_000;
/** Minimum time between two checks of the same payment. */
const MIN_INTERVAL_MS = 10_000;
/** A payment is checked with the provider at most this many times (then the webhook or a retry takes over). */
export const MAX_STATUS_CHECKS = 30;

/**
 * Asks ElgioPay for the status of one pending payment (server to server, with
 * our API key) and settles it if final. Works with or without webhooks; both
 * paths share `settlePayment`, so a payment is never applied twice.
 */
export async function checkPaymentStatus(paymentId: number) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId));
  if (
    !payment ||
    payment.provider !== "elgiopay" ||
    payment.status !== "pending" ||
    !payment.providerReference
  ) {
    return "skipped" as const;
  }

  if (payment.statusChecks >= MAX_STATUS_CHECKS)
    return "check_limit_reached" as const;

  // Claim the check first so concurrent callers (job + page refresh) don't both call ElgioPay.
  const claimed = await db
    .update(payments)
    .set({
      lastCheckedAt: new Date(),
      statusChecks: sql`${payments.statusChecks} + 1`,
    })
    .where(
      and(
        eq(payments.id, paymentId),
        lt(payments.statusChecks, MAX_STATUS_CHECKS),
        or(
          isNull(payments.lastCheckedAt),
          lt(payments.lastCheckedAt, new Date(Date.now() - MIN_INTERVAL_MS)),
        ),
      ),
    )
    .returning({ id: payments.id, statusChecks: payments.statusChecks });
  if (claimed.length === 0) return "recently_checked" as const;
  if (claimed[0]!.statusChecks === MAX_STATUS_CHECKS) {
    log.info(
      { paymentId },
      `last of ${MAX_STATUS_CHECKS} payment status checks`,
    );
  }

  const remote = await elgiopay.getPayment(payment.providerReference);
  log.debug(
    { paymentId, transactionId: remote.transaction_id, status: remote.status },
    "payment status checked",
  );
  if (remote.status !== "completed" && remote.status !== "failed") {
    return "pending" as const;
  }

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .for("update");
    if (!locked) return;
    await settlePayment(tx, locked, {
      status: remote.status as "completed" | "failed",
      errorCode: remote.error_code == null ? null : String(remote.error_code),
      message: remote.message ?? null,
      amount: remote.amount?.total ?? null,
      currency: remote.amount?.currency ?? null,
      payload: remote,
      source: "status_check",
    });
  });
  return remote.status as "completed" | "failed";
}

/** Job: checks every mobile money payment still pending (recent ones only). */
export async function checkPendingPayments(limit = 20) {
  const due = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.provider, "elgiopay"),
        eq(payments.status, "pending"),
        isNotNull(payments.providerReference),
        lt(payments.statusChecks, MAX_STATUS_CHECKS),
        gt(payments.createdAt, new Date(Date.now() - CHECK_WINDOW_MS)),
      ),
    )
    .orderBy(asc(payments.lastCheckedAt))
    .limit(limit);

  let settled = 0;
  for (const { id } of due) {
    try {
      const result = await checkPaymentStatus(id);
      if (result === "completed" || result === "failed") settled++;
    } catch (err) {
      log.warn(
        { err: loggableError(err), paymentId: id },
        "payment status check failed",
      );
    }
  }
  return settled;
}
