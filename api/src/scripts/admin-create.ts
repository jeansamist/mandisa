// Creates the admin account, or resets its password.
// Usage: pnpm admin:create <email> "<name>"   (a strong password is generated and printed once)
import { randomBytes } from "node:crypto";
import { db, pool } from "../db/client.js";
import { adminUsers } from "../db/schema.js";
import { audit } from "../admin/audit.js";
import { hashPassword } from "../admin/passwords.js";

const [emailArg, ...nameParts] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const name = nameParts.join(" ").trim() || "Admin";
if (!email || !email.includes("@")) {
  console.error('Usage: pnpm admin:create <email> "<name>"');
  process.exit(1);
}

const password = randomBytes(15).toString("base64url");
const passwordHash = await hashPassword(password);
const [user] = await db
  .insert(adminUsers)
  .values({ email, name, passwordHash })
  .onConflictDoUpdate({ target: adminUsers.email, set: { name, passwordHash } })
  .returning();
await audit(db, {
  adminUserId: user!.id,
  action: "password_set",
  entity: "admin_user",
  entityId: user!.id,
  data: { via: "cli" },
});
await pool.end();

console.log(
  `\nAdmin account ready: ${email}\nPassword (shown once, store it safely): ${password}\n`,
);
