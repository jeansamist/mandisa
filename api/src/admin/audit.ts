import type { Db } from "../db/client.js";
import { auditLog } from "../db/schema.js";
import { logger } from "../logger.js";

const log = logger.child({ module: "audit" });

/** Records a sensitive admin action (who, what, on which entity). */
export async function audit(
  db: Db,
  entry: {
    adminUserId: number | null;
    action: string;
    entity?: string;
    entityId?: string | number;
    data?: Record<string, unknown>;
  },
) {
  await db.insert(auditLog).values({
    adminUserId: entry.adminUserId,
    action: entry.action,
    entity: entry.entity ?? null,
    entityId: entry.entityId === undefined ? null : String(entry.entityId),
    data: entry.data ?? null,
  });
  log.info(
    {
      adminUserId: entry.adminUserId,
      entity: entry.entity,
      entityId: entry.entityId,
    },
    `audit: ${entry.action}`,
  );
}
