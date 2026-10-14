import { createHash, randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { adminSessions, adminUsers, auditLog } from "../db/schema.js";
import { env } from "../env.js";
import { CheckoutError } from "../services/errors.js";
import { audit } from "./audit.js";
import { verifyPassword } from "./passwords.js";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type AdminIdentity = { id: number; email: string; name: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `requireAdmin`. */
      admin?: AdminIdentity;
    }
  }
}

/**
 * Email + password login. Locked for 15 minutes after 5 failures on the same
 * email; the same error is returned whether the email or the password is wrong.
 */
export async function login(
  email: string,
  password: string,
  userAgent: string | null,
) {
  const normalized = email.trim().toLowerCase();

  const [{ failures } = { failures: 0 }] = await db
    .select({ failures: count() })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.action, "login_failed"),
        eq(auditLog.entityId, normalized),
        gt(auditLog.createdAt, new Date(Date.now() - LOCK_MINUTES * 60_000)),
      ),
    );
  if (failures >= MAX_FAILED_LOGINS) {
    throw new CheckoutError("too_many_attempts", undefined, 429);
  }

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalized));
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : false;
  if (!user || !valid) {
    await audit(db, {
      adminUserId: null,
      action: "login_failed",
      entity: "admin_user",
      entityId: normalized,
    });
    throw new CheckoutError("invalid_credentials", undefined, 401);
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.ADMIN_SESSION_HOURS * 3_600_000);
  await db.transaction(async (tx) => {
    await tx.insert(adminSessions).values({
      tokenHash: hashToken(token),
      adminUserId: user.id,
      expiresAt,
      userAgent: userAgent?.slice(0, 300) ?? null,
    });
    await tx
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, user.id));
    await audit(tx, {
      adminUserId: user.id,
      action: "login",
      entity: "admin_user",
      entityId: user.id,
    });
  });
  return {
    token,
    expiresAt,
    admin: { id: user.id, email: user.email, name: user.name },
  };
}

export async function logout(token: string, adminUserId: number) {
  await db
    .delete(adminSessions)
    .where(eq(adminSessions.tokenHash, hashToken(token)));
  await audit(db, {
    adminUserId,
    action: "logout",
    entity: "admin_user",
    entityId: adminUserId,
  });
}

/** Requires a valid admin session (header x-admin-session, set by the web server). */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const token = req.header("x-admin-session");
  if (!token) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  const [row] = await db
    .select({ session: adminSessions, user: adminUsers })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminUserId))
    .where(
      and(
        eq(adminSessions.tokenHash, hashToken(token)),
        gt(adminSessions.expiresAt, new Date()),
      ),
    );
  if (!row) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  // Touch at most once a minute to avoid a write per request.
  if (Date.now() - row.session.lastSeenAt.getTime() > 60_000) {
    await db
      .update(adminSessions)
      .set({ lastSeenAt: sql`now()` })
      .where(eq(adminSessions.id, row.session.id));
  }
  req.admin = { id: row.user.id, email: row.user.email, name: row.user.name };
  req.log = req.log.child({ adminUserId: row.user.id });
  next();
};
