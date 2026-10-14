"use server";

import { refresh } from "next/cache";
import { msMutate } from "@/lib/ms-api";
import type { ContactMessage } from "@/lib/ms-types";

/** Marks a contact message new / read / archived, then refreshes the page. */
export async function setMessageStatus(
  id: number,
  status: ContactMessage["status"],
): Promise<void> {
  const result = await msMutate(`/messages/${id}`, {
    method: "PUT",
    body: { status },
  });
  if (!result.ok) {
    throw new Error(`message status update failed: ${result.error}`);
  }
  refresh();
}
