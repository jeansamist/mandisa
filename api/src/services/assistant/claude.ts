import { Anthropic } from "@anthropic-ai/sdk";
import { env } from "../../env.js";
import { loggableError, logger } from "../../logger.js";
import { CheckoutError } from "../errors.js";
import { toolDefinitions } from "./tools.js";
import { MAX_TOOL_ROUNDS, type TurnInput, type TurnResult } from "./turn.js";

const log = logger.child({ module: "assistant", provider: "anthropic" });

let client: Anthropic | null = null;
function anthropic() {
  if (!env.ANTHROPIC_API_KEY)
    throw new CheckoutError("assistant_unavailable", undefined, 503);
  client ??= new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    // Keys not scoped to a workspace must name one on every request.
    defaultHeaders: env.ANTHROPIC_WORKSPACE_ID
      ? { "anthropic-workspace-id": env.ANTHROPIC_WORKSPACE_ID }
      : undefined,
  });
  return client;
}

/** The Claude call, behind an object so tests can replace it. */
export const assistantModel = {
  create: async (
    params: Anthropic.Beta.MessageCreateParamsNonStreaming,
  ): Promise<Anthropic.Beta.BetaMessage> =>
    anthropic().beta.messages.create(params),
};

/** Stored form of a customer message. */
export const claudeUserContent = (text: string) => [{ type: "text", text }];

function visibleText(content: Anthropic.Beta.BetaContentBlock[]) {
  const text = content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || null;
}

/** Claude loop: replays the stored history as-is (thinking blocks must stay unchanged). */
export async function runClaudeTurn(turn: TurnInput): Promise<TurnResult> {
  const messages: Anthropic.Beta.BetaMessageParam[] = turn.history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content as Anthropic.Beta.BetaMessageParam["content"],
  }));
  const tools = toolDefinitions.filter((t) =>
    turn.enabledTools.includes(t.name),
  );
  // Claude Haiku 5.5 has no server-side refusal fallback; larger models use Anthropic's default routing.
  const isHaiku = turn.model === "claude-haiku-5-5";
  const result: TurnResult = { reply: null, inputTokens: 0, outputTokens: 0 };

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await assistantModel.create({
        model: turn.model,
        max_tokens: 16000,
        betas: isHaiku ? [] : ["server-side-fallback-2026-07-01"],
        ...(isHaiku ? {} : { fallbacks: "default" as const }),
        output_config: { effort: turn.effort },
        system: [
          {
            type: "text",
            text: turn.system.stable,
            cache_control: { type: "ephemeral" },
          },
          { type: "text", text: turn.system.locale },
        ],
        tools,
        messages,
      });
      result.inputTokens +=
        response.usage.input_tokens +
        (response.usage.cache_read_input_tokens ?? 0) +
        (response.usage.cache_creation_input_tokens ?? 0);
      result.outputTokens += response.usage.output_tokens;

      // Refused or cut off: keep the history clean (nothing half-finished is stored).
      if (response.stop_reason === "refusal") {
        log.warn(
          {
            conversationId: turn.conversationId,
            category: response.stop_details?.category,
          },
          "assistant refused",
        );
        break;
      }
      const toolUses = response.content.filter(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
      );
      if (response.stop_reason === "max_tokens" && toolUses.length > 0) {
        log.warn(
          { conversationId: turn.conversationId },
          "assistant tool call truncated at max_tokens",
        );
        break;
      }

      await turn.store(
        "assistant",
        response.content,
        visibleText(response.content),
      );
      messages.push({ role: "assistant", content: response.content });

      if (toolUses.length === 0) {
        result.reply = visibleText(response.content);
        break;
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const call of toolUses) {
        const { content, isError } = await turn.callTool(call.name, call.input);
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content,
          is_error: isError,
        });
      }
      // All results of a turn go back in a single user message.
      await turn.store("user", results, null);
      messages.push({ role: "user", content: results });
    }
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      log.warn(
        { conversationId: turn.conversationId },
        "assistant rate limited by the Claude API",
      );
    } else if (err instanceof Anthropic.APIError) {
      log.error(
        {
          err: loggableError(err),
          status: err.status,
          conversationId: turn.conversationId,
        },
        "assistant API error",
      );
    } else {
      throw err;
    }
  }
  return result;
}
