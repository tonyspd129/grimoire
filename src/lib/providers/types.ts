// ============================================================================
// LLMProvider interface — THE public contract for all providers.
// NEVER modify the shape of these types without a major version bump.
// ============================================================================

export interface Model {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
}

export interface Message {
  role: "user" | "assistant";
  content: MessageContent[];
}

export type MessageContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type StreamEventType = "text_delta" | "tool_call" | "usage" | "stop" | "error";

export interface StreamEvent {
  type: StreamEventType;
  delta?: string;
  toolCall?: { id: string; name: string; args: unknown };
  usage?: { input: number; output: number };
  error?: string;
}

export interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly models: Model[];

  stream(
    messages: Message[],
    systemPrompt: string,
    tools: ToolDefinition[],
    apiKey: string,
    signal?: AbortSignal
  ): AsyncIterable<StreamEvent>;

  complete(
    messages: Message[],
    apiKey: string,
    signal?: AbortSignal
  ): Promise<string>;

  testConnection(apiKey: string): Promise<{ ok: boolean; error?: string }>;
}
