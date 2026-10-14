"use server";

import { API_URL, apiHeaders } from "@/lib/api";

export type ContactInput = {
  name: string;
  phone: string;
  message: string;
  locale: string;
  visitorId: string | null;
};

/** Contact form: saved by the API for /ms, the founder gets a WhatsApp alert. */
export async function sendContactMessage(
  input: ContactInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_URL}/contact`, {
      method: "POST",
      headers: apiHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: input.name,
        phone: input.phone,
        message: input.message,
        locale: input.locale === "en" ? "en" : "fr",
        visitorId: input.visitorId,
      }),
      cache: "no-store",
    });
    if (res.ok) return { ok: true };
    const json = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    return { ok: false, error: json?.error ?? "generic" };
  } catch {
    return { ok: false, error: "network" };
  }
}
