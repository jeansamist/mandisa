import { drizzle } from "drizzle-orm/node-postgres";
import type { Logger } from "drizzle-orm/logger";
import pg from "pg";
import { env } from "../env.js";
import { logger } from "../logger.js";
import * as schema from "./schema.js";

const dbLogger = logger.child({ module: "db" });

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

pool.on("connect", () => dbLogger.debug("postgres client connected"));
pool.on("error", (err) => dbLogger.error({ err }, "postgres pool error"));

// Every SQL statement at debug level. Params may hold personal data later
// (customers, orders), so they are only logged at trace level.
class QueryLogger implements Logger {
  logQuery(query: string, params: unknown[]) {
    if (dbLogger.isLevelEnabled("trace")) {
      dbLogger.trace({ query, params }, "db query");
    } else {
      dbLogger.debug({ query, paramCount: params.length }, "db query");
    }
  }
}

export const db = drizzle(pool, { schema, logger: new QueryLogger() });
