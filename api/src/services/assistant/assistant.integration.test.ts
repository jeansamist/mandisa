import type Anthropic from "@anthropic-ai/sdk";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../../../test/fixtures.js";
import { db, pool } from "../../db/client.js";
import {
  aiActions,
  aiConversations,
  aiMessages,
  notifications,
} from "../../db/schema.js";
import { assistantModel, sendMessage } from "./chat.js";

type Reply = Partial<Anthropic.Beta.BetaMessage> & {
  content: Anthropic.Beta.BetaContentBlock[];
};
const create = vi.spyOn(assistantModel, "create");
/** Copies of the requests as sent (the loop keeps appending to the same array). */
let sent: Anthropic.Beta.MessageCreateParamsNonStreaming[] = [];

function reply(r: Reply) {
  return {
    id: "msg",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    stop_details: null,
    usage: { input_tokens: 100, output_tokens: 20 },
    ...r,
  } as unknown as Anthropic.Beta.BetaMessage;
}
const text = (t: string) =>
  ({ type: "text", text: t, citations: null }) as Anthropic.Beta.BetaTextBlock;
const toolUse = (name: string, input: unknown, id = "tu_1") =>
  ({ type: "tool_use", id, name, input }) as Anthropic.Beta.BetaToolUseBlock;

const visitorId = crypto.randomUUID();

beforeEach(async () => {
  await resetDatabase();
  create.mockReset();
  sent = [];
});

/** Queues stub replies and records a snapshot of each request. */
function queue(...replies: Anthropic.Beta.BetaMessage[]) {
  create.mockImplementation(async (params) => {
    sent.push(structuredClone(params));
    return replies[Math.min(sent.length - 1, replies.length - 1)]!;
  });
}

afterAll(async () => {
  await pool.end();
});

describe("site assistant", () => {
  it("answers with catalog tools and keeps the full history", async () => {
    queue(
      reply({
        stop_reason: "tool_use",
        content: [
          toolUse("search_catalog", {
            texture: "afro",
            max_price_xaf: null,
            available_only: true,
          }),
        ],
      }),
      reply({ content: [text("Je vous conseille Nadège, 98 000 FCFA.")] }),
    );

    const result = await sendMessage({
      locale: "fr",
      visitorId,
      message: "Une perruque afro ?",
    });

    expect(result.reply).toBe("Je vous conseille Nadège, 98 000 FCFA.");
    expect(result.products.map((p) => p.code)).toEqual(["MDS-W01"]);

    // The second call replays the tool turn and its result.
    const secondCall = sent[1]!;
    expect(secondCall.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
    expect(secondCall.fallbacks).toBe("default");
    expect(secondCall.betas).toEqual(["server-side-fallback-2026-07-01"]);

    const stored = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, result.conversationId))
      .orderBy(asc(aiMessages.id));
    expect(stored.map((m) => [m.role, m.text])).toEqual([
      ["user", "Une perruque afro ?"],
      ["assistant", null],
      ["user", null],
      ["assistant", "Je vous conseille Nadège, 98 000 FCFA."],
    ]);
    const [action] = await db.select().from(aiActions);
    expect(action).toMatchObject({ tool: "search_catalog", isError: false });
  });

  it("continues the same conversation for the same visitor only", async () => {
    create.mockResolvedValue(reply({ content: [text("Bonjour !")] }));
    const first = await sendMessage({
      locale: "fr",
      visitorId,
      message: "Bonjour",
    });
    const again = await sendMessage({
      locale: "fr",
      visitorId,
      conversationId: first.conversationId,
      message: "Encore",
    });
    expect(again.conversationId).toBe(first.conversationId);
    const stranger = await sendMessage({
      locale: "fr",
      visitorId: crypto.randomUUID(),
      conversationId: first.conversationId,
      message: "Hack",
    });
    expect(stranger.conversationId).not.toBe(first.conversationId);
  });

  it("rejects invalid tool inputs instead of running them", async () => {
    create
      .mockResolvedValueOnce(
        reply({
          stop_reason: "tool_use",
          content: [toolUse("search_catalog", { texture: "plastic" })],
        }),
      )
      .mockResolvedValueOnce(
        reply({ content: [text("Pouvez-vous préciser ?")] }),
      );
    await sendMessage({ locale: "fr", visitorId, message: "?" });
    const [action] = await db.select().from(aiActions);
    expect(action).toMatchObject({ isError: true });
    expect(action!.resultSummary).toContain("invalid_input");
  });

  it("hands off to a human and alerts the founder", async () => {
    create
      .mockResolvedValueOnce(
        reply({
          stop_reason: "tool_use",
          content: [
            toolUse("handoff_to_human", {
              reason: "return_or_refund",
              summary: "Wants a refund.",
            }),
          ],
        }),
      )
      .mockResolvedValueOnce(
        reply({ content: [text("Notre équipe vous répond sur WhatsApp.")] }),
      );
    const result = await sendMessage({
      locale: "fr",
      visitorId,
      message: "Je veux être remboursée",
    });
    expect(result.handedOff).toBe(true);
    expect(result.whatsapp).toBe("+237600000000");
    const [conversation] = await db.select().from(aiConversations);
    expect(conversation!.status).toBe("handed_off");
    const templates = (await db.select().from(notifications)).map(
      (n) => n.template,
    );
    expect(templates).toContain("admin_ai_handoff");
  });

  it("does not store refused answers and points to WhatsApp", async () => {
    create.mockResolvedValueOnce(
      reply({ stop_reason: "refusal", content: [] }),
    );
    const result = await sendMessage({
      locale: "en",
      visitorId,
      message: "Something odd",
    });
    expect(result.reply).toContain("WhatsApp");
    const stored = await db.select().from(aiMessages);
    expect(stored.map((m) => m.role)).toEqual(["user"]);
  });
});
