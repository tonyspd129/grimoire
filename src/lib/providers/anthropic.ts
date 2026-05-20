import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, Message, Model, StreamEvent, ToolDefinition } from "./types";

const MODELS: Model[] = [
  { id: "claude-opus-4-7", name: "Claude Opus 4.7", contextWindow: 200000, maxTokens: 32000 },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", contextWindow: 200000, maxTokens: 16000 },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", contextWindow: 200000, maxTokens: 8192 },
];

function toAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content.map((c) => {
      if (c.type === "text") return { type: "text" as const, text: c.text };
      if (c.type === "tool_use") return { type: "tool_use" as const, id: c.id, name: c.name, input: c.input };
      return { type: "tool_result" as const, tool_use_id: c.tool_use_id, content: c.content };
    }),
  }));
}

export const AnthropicProvider: LLMProvider = {
  id: "anthropic",
  name: "Anthropic",
  models: MODELS,

  async *stream(messages, systemPrompt, tools, apiKey, signal) {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const model = messages.length > 0 ? "claude-sonnet-4-6" : "claude-sonnet-4-6";

    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: { type: "object" as const, ...t.parameters },
    }));

    try {
      const stream = client.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        messages: toAnthropicMessages(messages),
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      });

      for await (const event of stream) {
        if (signal?.aborted) break;

        if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            yield { type: "text_delta", delta: event.delta.text };
          } else if (event.delta.type === "input_json_delta") {
            // Accumulation handled at the message_delta level
          }
        } else if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            // Will emit tool_call at message_delta stop
          }
        } else if (event.type === "message_delta") {
          if (event.delta.stop_reason === "tool_use") {
            const msg = await stream.finalMessage();
            for (const block of msg.content) {
              if (block.type === "tool_use") {
                yield { type: "tool_call", toolCall: { id: block.id, name: block.name, args: block.input } };
              }
            }
          }
        } else if (event.type === "message_stop") {
          yield { type: "stop" };
        }
      }
    } catch (err: any) {
      yield { type: "error", error: err.message ?? String(err) };
    }
  },

  async complete(messages, apiKey, signal) {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: toAnthropicMessages(messages),
    });
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  },

  async testConnection(apiKey) {
    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "hi" }],
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message ?? String(err) };
    }
  },
};
