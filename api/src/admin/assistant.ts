import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  aiActions,
  aiConfig,
  aiConversations,
  aiMessages,
} from "../db/schema.js";
import {
  ASSISTANT_EFFORTS,
  ASSISTANT_MODELS,
  ASSISTANT_TOOLS,
  getAssistantConfig,
  hasApiKey,
  type AssistantConfigUpdate,
} from "../services/assistant/config.js";
import { CheckoutError } from "../services/errors.js";
import { audit } from "./audit.js";

export async function adminGetAssistantConfig() {
  const config = await getAssistantConfig();
  return {
    config,
    options: {
      models: ASSISTANT_MODELS,
      efforts: ASSISTANT_EFFORTS,
      tools: ASSISTANT_TOOLS,
    },
    apiKeyConfigured: hasApiKey(),
  };
}

export async function adminUpdateAssistantConfig(
  adminUserId: number,
  input: AssistantConfigUpdate,
) {
  await getAssistantConfig();
  await db
    .update(aiConfig)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(aiConfig.id, 1));
  await audit(db, {
    adminUserId,
    action: "assistant_config_updated",
    entity: "ai_config",
    entityId: 1,
    // Long texts are not copied into the audit log, only their size.
    data: {
      enabled: input.enabled,
      model: input.model,
      effort: input.effort,
      enabledTools: input.enabledTools,
      instructionsLength: input.instructions.length,
      knowledgeLength: input.knowledge.length,
    },
  });
}

export async function adminListConversations(
  page: number,
  status?: "open" | "handed_off",
) {
  const pageSize = 30;
  const where = status ? eq(aiConversations.status, status) : undefined;
  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select()
      .from(aiConversations)
      .where(where)
      .orderBy(desc(aiConversations.lastMessageAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(aiConversations).where(where),
  ]);
  return { conversations: rows, page, pageSize, total };
}

/** Customer-visible messages and every tool call, in order. */
export async function adminGetConversation(id: string) {
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.id, id));
  if (!conversation)
    throw new CheckoutError("conversation_not_found", undefined, 404);
  const [messages, actions] = await Promise.all([
    db
      .select({
        id: aiMessages.id,
        role: aiMessages.role,
        text: aiMessages.text,
        createdAt: aiMessages.createdAt,
      })
      .from(aiMessages)
      .where(and(eq(aiMessages.conversationId, id)))
      .orderBy(asc(aiMessages.id)),
    db
      .select()
      .from(aiActions)
      .where(eq(aiActions.conversationId, id))
      .orderBy(asc(aiActions.id)),
  ]);
  return {
    conversation,
    messages: messages.filter((m) => m.text !== null),
    actions,
  };
}
