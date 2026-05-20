export type { LLMProvider, Message, MessageContent, Model, StreamEvent, StreamEventType, ToolDefinition } from "./types";
export { AnthropicProvider } from "./anthropic";
export { OpenAIProvider } from "./openai";
export { GoogleProvider } from "./google";

import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { GoogleProvider } from "./google";
import type { LLMProvider } from "./types";

// To add a new provider: implement LLMProvider interface, import here, add to array.
export const PROVIDERS: LLMProvider[] = [AnthropicProvider, OpenAIProvider, GoogleProvider];

export function getProvider(id: string): LLMProvider {
  const p = PROVIDERS.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}
