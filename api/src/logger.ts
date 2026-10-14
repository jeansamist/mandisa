import { pino } from "pino";
import { env } from "./env.js";

/**
 * Database errors wrap the driver error and embed the full SQL and its
 * parameters (possibly personal data) in their message. Log the driver error
 * and a shortened query instead. Use for every `err` passed to a logger.
 */
export function loggableError(err: unknown) {
  if (err instanceof Error && "query" in err && err.cause instanceof Error) {
    const cause = err.cause as Error & { query?: string };
    cause.query = String(err.query).slice(0, 300);
    return cause;
  }
  return err;
}

/**
 * Application logger. JSON lines in production (ready for a log collector),
 * pretty-printed in development.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "mandisa-api", env: env.NODE_ENV },
  serializers: {
    err: (err: unknown) => pino.stdSerializers.err(loggableError(err) as Error),
  },
  // Never write credentials to the logs.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.token",
    ],
    censor: "[redacted]",
  },
  transport:
    env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            // The request summary is already in the message; keep dev output to one line.
            ignore: "pid,hostname,service,env,req,res,responseTime",
          },
        },
});
