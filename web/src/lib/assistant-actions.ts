"use server";

import { API_URL, apiHeaders } from "@/lib/api";
import type { Product } from "@/lib/catalog";

// Server actions for the site chat: the browser never calls the API directly.

export type AssistantPublicConfig = {
  available: boolean;
  greeting: { fr: string; en: string };
};

export type AssistantReply = {
  conversationId: string;
  reply: string;
  products: Product[];
  handedOff: boolean;
  whatsapp: string | null;
};

export type AssistantResult =
  { ok: true; data: AssistantReply } | { ok: false; error: string };

export async function getAssistantConfig(): Promise<AssistantPublicConfig> {
  try {
    const res = await fetch(`${API_URL}/assistant/config`, {
      headers: apiHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as AssistantPublicConfig;
  } catch {
    return { available: false, greeting: { fr: "", en: "" } };
  }
}

export async function sendAssistantMessage(input: {
  conversationId: string | null;
  visitorId: string | null;
  locale: string;
  message: string;
}): Promise<AssistantResult> {
  try {
    const res = await fetch(`${API_URL}/assistant/messages`, {
      method: "POST",
      headers: apiHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        conversationId: input.conversationId,
        visitorId: input.visitorId,
        locale: input.locale === "en" ? "en" : "fr",
        message: input.message.slice(0, 1000),
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      (AssistantReply & { error?: string }) | null;
    if (!res.ok || !json) return { ok: false, error: json?.error ?? "error" };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "network" };
  }
}
