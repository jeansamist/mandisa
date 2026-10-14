import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../../../test/fixtures.js";
import { db, pool } from "../../db/client.js";
import { aiActions, aiConfig, aiConversations } from "../../db/schema.js";
import { assistantModel, geminiModel, sendMessage } from "./chat.js";
import { getAssistantConfig } from "./config.js";
import { toGeminiSchema } from "./gemini.js";
import { toolDefinitions } from "./tools.js";

type GeminiCall = Parameters<typeof geminiModel.create>[0];
type GeminiReply = Awaited<ReturnType<typeof geminiModel.create>>;

const create = vi.spyOn(geminiModel, "create");
const claude = vi.spyOn(assistantModel, "create");
let sent: GeminiCall[] = [];

function queue(...replies: GeminiReply[]) {
  create.mockImplementation(async (params) => {
    sent.push(structuredClone(params));
    return replies[Math.min(sent.length - 1, replies.length - 1)]!;
  });
}

const visitorId = crypto.randomUUID();

beforeEach(async () => {
  await resetDatabase();
  create.mockReset();
  claude.mockReset();
  sent = [];
  await getAssistantConfig();
  await db.update(aiConfig).set({ model: "gemini-3.5-flash-lite" });
});

afterAll(async () => {
  await pool.end();
});

describe("Gemini assistant", () => {
  it("answers with catalog tools and resends steps unchanged", async () => {
    queue(
      {
        status: "completed",
        steps: [
          { type: "thought", signature: "sig-123" },
          {
            type: "function_call",
            id: "call_1",
            name: "search_catalog",
            arguments: { texture: "afro", available_only: true },
          },
        ],
        usage: { total_input_tokens: 120, total_output_tokens: 15 },
      },
      {
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: "Nadège vous irait bien." }],
          },
        ],
        output_text: "Nadège vous irait bien.",
        usage: { total_input_tokens: 200, total_output_tokens: 10 },
      },
    );

    const result = await sendMessage({
      locale: "fr",
      visitorId,
      message: "Une perruque afro ?",
    });

    expect(result.reply).toBe("Nadège vous irait bien.");
    expect(result.products.map((p) => p.code)).toEqual(["MDS-W01"]);
    expect(claude).not.toHaveBeenCalled();

    const [first, second] = sent;
    expect(first!.model).toBe("gemini-3.5-flash-lite");
    expect(first!.generation_config).toEqual({ thinking_level: "low" });
    expect(first!.input).toEqual([
      {
        type: "user_input",
        content: [{ type: "text", text: "Une perruque afro ?" }],
      },
    ]);
    // The thought signature and the call are resent exactly, followed by the result.
    expect(second!.input.map((s) => s.type)).toEqual([
      "user_input",
      "thought",
      "function_call",
      "function_result",
    ]);
    expect(second!.input[1]).toEqual({ type: "thought", signature: "sig-123" });
    expect(second!.input[3]).toMatchObject({
      call_id: "call_1",
      name: "search_catalog",
      is_error: false,
    });

    const [conversation] = await db.select().from(aiConversations);
    expect(conversation).toMatchObject({
      model: "gemini-3.5-flash-lite",
      inputTokens: 320,
      outputTokens: 25,
    });
    const [action] = await db.select().from(aiActions);
    expect(action).toMatchObject({ tool: "search_catalog", isError: false });
  });

  it("keeps a conversation on Gemini after the default model changes", async () => {
    queue({
      status: "completed",
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text: "Bonjour !" }],
        },
      ],
    });
    const first = await sendMessage({
      locale: "fr",
      visitorId,
      message: "Bonjour",
    });
    await db.update(aiConfig).set({ model: "claude-haiku-5-5" });

    const again = await sendMessage({
      locale: "fr",
      visitorId,
      conversationId: first.conversationId,
      message: "Encore",
    });
    expect(again.conversationId).toBe(first.conversationId);
    expect(create).toHaveBeenCalledTimes(2);
    expect(claude).not.toHaveBeenCalled();
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.id, first.conversationId));
    expect(conversation!.model).toBe("gemini-3.5-flash-lite");
  });

  it("falls back to WhatsApp when Gemini returns nothing", async () => {
    queue({ status: "failed", steps: [] });
    const result = await sendMessage({
      locale: "en",
      visitorId,
      message: "Hello",
    });
    expect(result.reply).toContain("WhatsApp");
  });
});

describe("Gemini tool schemas", () => {
  it("turns nullable fields into optional ones", () => {
    const search = toolDefinitions.find((t) => t.name === "search_catalog")!;
    const schema = toGeminiSchema(
      search.input_schema as Record<string, unknown>,
    );
    expect(schema.required).toEqual(["available_only"]);
    expect(schema.properties.texture).toMatchObject({
      type: "string",
      enum: ["afro", "kinkyYaki", "lightYaki", "curly"],
    });
    expect(schema.properties.max_price_xaf).toMatchObject({ type: "integer" });
  });
});
