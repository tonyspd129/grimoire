import OpenAI from "openai";
import type { LLMProvider, Message, Model, StreamEvent, ToolDefinition } from "./types";

const MODELS: Model[] = [
  { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, maxTokens: 16384 },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, maxTokens: 16384 },
  { id: "o1-mini", name: "o1 Mini", contextWindow: 128000, maxTokens: 65536 },
];

function toOpenAIMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      const textParts = m.content.filter((c) => c.type === "text");
      result.push({ role: "user", content: textParts.map((c) => (c as any).text).join("\n") });
    } else {
      const textParts = m.content.filter((c) => c.type === "text");
      const toolCalls = m.content.filter((c) => c.type === "tool_use") as any[];
      if (toolCalls.length > 0) {
        result.push({
          role: "assistant",
          content: textParts.map((c) => (c as any).text).join("\n") || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.input) },
          })),
        });
      } else {
        result.push({ role: "assistant", content: textParts.map((c) => (c as any).text).join("\n") });
      }
    }
  }
  return result;
}

export const OpenAIProvider: LLMProvider = {
  id: "openai",
  name: "OpenAI",
  models: MODELS,

  async *stream(messages, systemPrompt, tools, apiKey, signal) {
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const openAITools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.parameters as any },
    }));

    try {
      const stream = await client.chat.completions.create({
        model: "gpt-4o",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...toOpenAIMessages(messages)],
        tools: openAITools.length > 0 ? openAITools : undefined,
      });

      let toolCallAccum: Record<string, { id: string; name: string; args: string }> = {};

      for await (const chunk of stream) {
        if (signal?.aborted) break;
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          yield { type: "text_delta", delta: delta.content };
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCallAccum[tc.index]) {
              toolCallAccum[tc.index] = { id: tc.id ?? "", name: tc.function?.name ?? "", args: "" };
            }
            if (tc.id) toolCallAccum[tc.index].id = tc.id;
            if (tc.function?.name) toolCallAccum[tc.index].name = tc.function.name;
            if (tc.function?.arguments) toolCallAccum[tc.index].args += tc.function.arguments;
          }
        }

        if (chunk.choices[0]?.finish_reason === "tool_calls") {
          for (const tc of Object.values(toolCallAccum)) {
            let args: unknown = {};
            try { args = JSON.parse(tc.args); } catch {}
            yield { type: "tool_call", toolCall: { id: tc.id, name: tc.name, args } };
          }
          toolCallAccum = {};
        }

        if (chunk.choices[0]?.finish_reason === "stop") {
          yield { type: "stop" };
        }
      }
    } catch (err: any) {
      yield { type: "error", error: err.message ?? String(err) };
    }
  },

  async complete(messages, apiKey) {
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: toOpenAIMessages(messages),
    });
    return response.choices[0]?.message?.content ?? "";
  },

  async testConnection(apiKey) {
    try {
      const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 5,
        messages: [{ role: "user", content: "hi" }],
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message ?? String(err) };
    }
  },
};
