import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { contactMessages } from "../db/schema.js";
import { audit } from "../admin/audit.js";
import { CheckoutError } from "./errors.js";
import { notifyAdmin } from "./notifications.js";
import { normalizePhone } from "./phone.js";

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(30),
  message: z.string().trim().min(1).max(2000),
  locale: z.enum(["fr", "en"]),
  visitorId: z.string().uuid().nullish(),
});

/** Contact form on the site: saved for /ms, and the founder gets a WhatsApp alert. */
export async function submitContactMessage(
  input: z.infer<typeof contactSchema>,
) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new CheckoutError("invalid_phone");
  await db.transaction(async (tx) => {
    const [saved] = await tx
      .insert(contactMessages)
      .values({ ...input, phone, visitorId: input.visitorId ?? null })
      .returning({ id: contactMessages.id });
    await notifyAdmin(tx, {
      orderId: null,
      template: "admin_contact_message",
      params: {
        name: input.name,
        phone,
        message: input.message.slice(0, 300),
        id: String(saved!.id),
      },
    });
  });
}

export async function adminListContactMessages(
  status?: "new" | "read" | "archived",
) {
  return db
    .select()
    .from(contactMessages)
    .where(status ? eq(contactMessages.status, status) : undefined)
    .orderBy(desc(contactMessages.createdAt))
    .limit(200);
}

export async function adminSetContactStatus(
  adminUserId: number,
  id: number,
  status: "new" | "read" | "archived",
) {
  const [updated] = await db
    .update(contactMessages)
    .set({ status })
    .where(eq(contactMessages.id, id))
    .returning();
  if (!updated) throw new CheckoutError("message_not_found", undefined, 404);
  await audit(db, {
    adminUserId,
    action: "contact_message_status",
    entity: "contact_message",
    entityId: id,
    data: { status },
  });
}
