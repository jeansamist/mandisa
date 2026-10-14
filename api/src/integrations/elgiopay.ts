import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../env.js";
import { logger } from "../logger.js";

// ElgioPay API client (see elgiopay-api-documentation.yaml at the repo root).

const log = logger.child({ module: "elgiopay" });

export type ElgioPayMethod = "mtn_mobile_money" | "orange_money";
export type ElgioPayStatus = "pending" | "processing" | "completed" | "failed";

export function isElgioPayConfigured() {
  return Boolean(env.ELGIOPAY_API_KEY);
}

export class ElgioPayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

const initiateResponse = z.object({
  transaction_id: z.string(),
  status: z.string(),
  payment_url: z.string().nullable().optional(),
  message: z.string().optional(),
});

async function request(path: string, init: RequestInit) {
  if (!env.ELGIOPAY_API_KEY)
    throw new ElgioPayError("ElgioPay is not configured");
  const res = await fetch(`${env.ELGIOPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.ELGIOPAY_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    log.warn({ path, status: res.status, body }, "elgiopay request failed");
    throw new ElgioPayError(`ElgioPay ${path} failed`, res.status, body);
  }
  return body;
}

export const elgiopay = {
  getPayment: (transactionId: string) => getPayment(transactionId),

  /** Sends the mobile money prompt to the customer's phone. */
  async initiatePayment(input: {
    amountXaf: number;
    method: ElgioPayMethod;
    phone: string;
    customerName: string;
    customerEmail: string | null;
    reference: string;
    metadata: Record<string, string>;
  }) {
    const body = await request("/api/v1/payments", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amountXaf,
        currency: "XAF",
        payment_method: input.method,
        customer_phone: input.phone,
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        reference: input.reference,
        metadata: input.metadata,
      }),
    });
    const parsed = initiateResponse.parse(body);
    log.info(
      {
        reference: input.reference,
        transactionId: parsed.transaction_id,
        status: parsed.status,
      },
      "payment initiated",
    );
    return { transactionId: parsed.transaction_id, status: parsed.status };
  },
};

const paymentStatusResponse = z
  .object({
    transaction_id: z.string(),
    status: z.string(),
    amount: z
      .object({ total: z.number().nullish(), currency: z.string().nullish() })
      .nullish(),
    error_code: z.union([z.string(), z.number()]).nullish(),
    message: z.string().nullish(),
  })
  .passthrough();
export type ElgioPayPaymentStatus = z.infer<typeof paymentStatusResponse>;

/** Current status of a transaction, asked server to server with our API key. */
async function getPayment(
  transactionId: string,
): Promise<ElgioPayPaymentStatus> {
  const body = await request(
    `/api/v1/payments/${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
    },
  );
  return paymentStatusResponse.parse(body);
}

// --- Webhooks ---------------------------------------------------------------

export const webhookEnvelope = z.object({
  id: z.string().min(1),
  event: z.string(),
  created: z.number(),
  data: z
    .object({
      transaction_id: z.string(),
      status: z.string(),
      error_code: z.union([z.string(), z.number()]).nullish(),
      message: z.string().nullish(),
    })
    .passthrough(),
});
export type ElgioPayWebhook = z.infer<typeof webhookEnvelope>;

const TOLERANCE_SECONDS = 300;

/**
 * Verifies `X-Elgiopay-Signature: t=<unix>,v1=<hex hmac of "t.rawBody">`.
 * Rejects stale timestamps (replays) and compares in constant time.
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Builds a signature header (used by tests and local webhook simulation). */
export function signWebhook(
  rawBody: string,
  secret: string,
  t = Math.floor(Date.now() / 1000),
) {
  const v1 = createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  return `t=${t},v1=${v1}`;
}
