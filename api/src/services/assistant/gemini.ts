import { ApiError, GoogleGenAI } from "@google/genai";
import { env } from "../../env.js";
import { loggableError, logger } from "../../logger.js";
import { CheckoutError } from "../errors.js";
import { toolDefinitions } from "./tools.js";
import { MAX_TOOL_ROUNDS, type TurnInput, type TurnResult } from "./turn.js";

// Google Gemini through the Interactions API in stateless mode (store: false):
// we keep the history ourselves and resend the steps exactly as received.

const log = logger.child({ module: "assistant", provider: "gemini" });

/** The fields of an Interactions step/response this integration uses. */
type GeminiStep = {
  type: string;
  id?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  content?: { type: string; text?: string }[];
  [key: string]: unknown;
};
type GeminiResponse = {
  status?: string;
  steps?: GeminiStep[];
  output_text?: string;
  usage?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    total_thought_tokens?: number;
  };
};
type GeminiRequest = {
  model: string;
  system_instruction: string;
  tools: {
    type: "function";
    name: string;
    description: string;
    parameters: unknown;
  }[];
  input: GeminiStep[];
  generation_config: { thinking_level: string };
};

let client: GoogleGenAI | null = null;
function gemini() {
  if (!env.GEMINI_API_KEY)
    throw new CheckoutError("assistant_unavailable", undefined, 503);
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

/** The Gemini call, behind an object so tests can replace it. */
export const geminiModel = {
  create: async (params: GeminiRequest): Promise<GeminiResponse> => {
    const interaction = await gemini().interactions.create({
      ...params,
      // SDK step types are not exported; our steps are the API's own JSON, resent unchanged.
      input: params.input as never,
      store: false,
    });
    return interaction as unknown as GeminiResponse;
  },
};

/** Stored form of a customer message. */
export const geminiUserContent = (text: string): GeminiStep[] => [
  { type: "user_input", content: [{ type: "text", text }] },
];

/**
 * Our tool schemas use JSON Schema nullable types (["string", "null"]) for
 * Claude's strict mode. For Gemini, those fields become plain optional ones.
 */
export function toGeminiSchema(schema: Record<string, unknown>) {
  const properties = (schema.properties ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const required = new Set((schema.required ?? []) as string[]);
  const converted: Record<string, Record<string, unknown>> = {};
  for (const [name, prop] of Object.entries(properties)) {
    const next = { ...prop };
    if (Array.isArray(next.type)) {
      const types = next.type.filter((t) => t !== "null");
      if (types.length < next.type.length) required.delete(name);
      next.type = types.length === 1 ? types[0] : types;
    }
    if (Array.isArray(next.enum))
      next.enum = next.enum.filter((v) => v !== null);
    converted[name] = next;
  }
  return { type: "object", properties: converted, required: [...required] };
}

function stepsText(steps: GeminiStep[]) {
  const text = steps
    .filter((s) => s.type === "model_output")
    .flatMap((s) => s.content ?? [])
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("\n")
    .trim();
  return text || null;
}

/** Gemini loop: same tools and rules as Claude, history stored as Interactions steps. */
export async function runGeminiTurn(turn: TurnInput): Promise<TurnResult> {
  const history = turn.history.flatMap((m) => m.content as GeminiStep[]);
  const tools = toolDefinitions
    .filter((t) => turn.enabledTools.includes(t.name))
    .map((t) => ({
      type: "function" as const,
      name: t.name,
      description: t.description ?? "",
      parameters: toGeminiSchema(t.input_schema as Record<string, unknown>),
    }));
  const result: TurnResult = { reply: null, inputTokens: 0, outputTokens: 0 };

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await geminiModel.create({
        model: turn.model,
        system_instruction: `${turn.system.stable}\n\n${turn.system.locale}`,
        tools,
        input: history,
        generation_config: { thinking_level: turn.effort },
      });
      result.inputTokens += response.usage?.total_input_tokens ?? 0;
      result.outputTokens +=
        (response.usage?.total_output_tokens ?? 0) +
        (response.usage?.total_thought_tokens ?? 0);

      const steps = response.steps ?? [];
      if (response.status === "failed" || steps.length === 0) {
        log.warn(
          { conversationId: turn.conversationId, status: response.status },
          "gemini returned no output",
        );
        break;
      }
      const text = stepsText(steps) ?? response.output_text?.trim() ?? null;
      await turn.store("model", steps, text);
      history.push(...steps);

      const calls = steps.filter(
        (s) => s.type === "function_call" && s.id && s.name,
      );
      if (calls.length === 0) {
        result.reply = text;
        break;
      }

      const results: GeminiStep[] = [];
      for (const call of calls) {
        const { content, isError } = await turn.callTool(
          call.name!,
          call.arguments ?? {},
        );
        results.push({
          type: "function_result",
          call_id: call.id!,
          name: call.name!,
          is_error: isError,
          result: [{ type: "text", text: content }],
        });
      }
      await turn.store("user", results, null);
      history.push(...results);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      log.error(
        {
          err: loggableError(err),
          status: err.status,
          conversationId: turn.conversationId,
        },
        "assistant API error",
      );
    } else if (err instanceof CheckoutError) {
      throw err;
    } else if (err instanceof Error && "status" in err) {
      // Interactions client errors carry an HTTP status.
      log.error(
        { err: loggableError(err), conversationId: turn.conversationId },
        "assistant API error",
      );
    } else {
      throw err;
    }
  }
  return result;
}
