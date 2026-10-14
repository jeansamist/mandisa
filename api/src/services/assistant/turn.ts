// What a provider needs to run one customer turn, and what it returns.

export type TurnInput = {
  conversationId: string;
  model: string;
  effort: "low" | "medium" | "high";
  /** Stable rules + founder instructions (cacheable), then the per-conversation language line. */
  system: { stable: string; locale: string };
  enabledTools: string[];
  /** Stored history (provider-native content), oldest first, including the new customer message. */
  history: { role: string; content: unknown }[];
  /** Appends one provider turn to the stored history (append-only). */
  store: (role: string, content: unknown, text: string | null) => Promise<void>;
  /** Runs a tool call (validated, logged in ai_actions); never throws. */
  callTool: (
    name: string,
    input: unknown,
  ) => Promise<{ content: string; isError: boolean }>;
};

export type TurnResult = {
  /** Null when the model failed, refused or produced no text. */
  reply: string | null;
  inputTokens: number;
  outputTokens: number;
};

export const MAX_TOOL_ROUNDS = 6;
