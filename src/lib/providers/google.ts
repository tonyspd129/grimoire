import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, Message, Model, StreamEvent, ToolDefinition } from "./types";

const MODELS: Model[] = [
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", contextWindow: 1000000, maxTokens: 8192 },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 2000000, maxTokens: 8192 },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextWindow: 1000000, maxTokens: 8192 },
];

export const GoogleProvider: LLMProvider = {
  id: "google",
  name: "Google",
  models: MODELS,

  async *stream(messages, systemPrompt, tools, apiKey, signal) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: systemPrompt,
      });

      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: m.content
          .filter((c) => c.type === "text")
          .map((c) => ({ text: (c as any).text })),
      }));

      const lastMessage = messages[messages.length - 1];
      const lastText = lastMessage?.content
        .filter((c) => c.type === "text")
        .map((c) => (c as any).text)
        .join("\n") ?? "";

      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(lastText);

      for await (const chunk of result.stream) {
        if (signal?.aborted) break;
        const text = chunk.text();
        if (text) yield { type: "text_delta", delta: text };
      }
      yield { type: "stop" };
    } catch (err: any) {
      yield { type: "error", error: err.message ?? String(err) };
    }
  },

  async complete(messages, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const lastMessage = messages[messages.length - 1];
    const text = lastMessage?.content.filter((c) => c.type === "text").map((c) => (c as any).text).join("\n") ?? "";
    const result = await model.generateContent(text);
    return result.response.text();
  },

  async testConnection(apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      await model.generateContent("hi");
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message ?? String(err) };
    }
  },
};
