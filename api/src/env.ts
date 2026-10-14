import { z } from "zod";

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the environment.
}

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  /** Shared secret: only the web server may call the API (header x-internal-key). */
  INTERNAL_API_KEY: z.string().min(16),
  /** Public site URL, used in customer links (WhatsApp messages). */
  WEB_URL: z.string().url().default("http://localhost:3000"),

  // ElgioPay (mobile money). Without an API key, mobile money is not offered.
  ELGIOPAY_BASE_URL: z
    .string()
    .url()
    .default("https://sandbox-api.elgiopay.com"),
  ELGIOPAY_API_KEY: z.string().optional(),
  ELGIOPAY_WEBHOOK_SECRET: z.string().optional(),

  // Notifications (WhatsApp provider to be chosen; "log" only writes to the logs).
  NOTIFICATIONS_PROVIDER: z.enum(["log"]).default("log"),
  /** Founder's WhatsApp number for admin alerts, E.164. */
  ADMIN_WHATSAPP: z.string().optional(),

  // AI assistant (Claude API). Without a key, the site assistant is turned off.
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Only for keys not scoped to a workspace: the workspace to use (Console > Workspaces). */
  ANTHROPIC_WORKSPACE_ID: z.string().optional(),
  /** Google Gemini (Gemini models in /ms). Without a key, Gemini models are unavailable. */
  GEMINI_API_KEY: z.string().optional(),

  /** Secret Vercel sends to /cron/* (Authorization: Bearer …). */
  CRON_SECRET: z.string().min(16).optional(),
  /** Max database connections per instance (keep low on serverless; use a pooled URL). */
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  /** Admin (/ms) session length. */
  ADMIN_SESSION_HOURS: z.coerce.number().int().positive().default(12),

  // Stock reservations and unpaid orders.
  RESERVATION_MINUTES_MOBILE_MONEY: z.coerce
    .number()
    .int()
    .positive()
    .default(30),
  RESERVATION_HOURS_MANUAL: z.coerce.number().int().positive().default(72),
  UNPAID_ORDER_HOURS: z.coerce.number().int().positive().default(72),
  /** Background jobs (outbox, expirations). Disabled in tests. */
  JOBS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export const env = schema.parse(process.env);
