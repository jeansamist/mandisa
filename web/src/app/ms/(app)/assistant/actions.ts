"use server";

import { msMutate } from "@/lib/ms-api";

export type AssistantConfigInput = {
  enabled: boolean;
  model: string;
  effort: string;
  instructions: string;
  knowledge: string;
  greetingFr: string;
  greetingEn: string;
  enabledTools: string[];
};

export async function saveAssistantConfig(input: AssistantConfigInput) {
  return msMutate("/assistant/config", { method: "PUT", body: input });
}
