# Adding a new LLM provider

## Step 1: Create the provider file

```bash
touch src/lib/providers/mistral.ts
```

## Step 2: Implement the LLMProvider interface

```typescript
// src/lib/providers/mistral.ts
import type { LLMProvider, Message, Model, StreamEvent, ToolDefinition } from "./types";

const MODELS: Model[] = [
  { id: "mistral-large-latest", name: "Mistral Large", contextWindow: 128000, maxTokens: 8192 },
  { id: "mistral-small-latest", name: "Mistral Small", contextWindow: 32000, maxTokens: 4096 },
];

export const MistralProvider: LLMProvider = {
  id: "mistral",      // must be unique across all providers
  name: "Mistral",    // shown in Settings UI
  models: MODELS,

  async *stream(messages, systemPrompt, tools, apiKey, signal) {
    // Call Mistral streaming API here
    // yield { type: "text_delta", delta: "..." } for text chunks
    // yield { type: "tool_call", toolCall: { id, name, args } } for tool calls
    // yield { type: "stop" } when done
    // yield { type: "error", error: "..." } on failure
  },

  async complete(messages, apiKey, signal) {
    // Non-streaming completion, used by the learning extractor
    // Returns the full response as a string
  },

  async testConnection(apiKey) {
    // Make a minimal API call to verify the key works
    // Return { ok: true } or { ok: false, error: "message" }
  },
};
```

## Step 3: Register the provider

```typescript
// src/lib/providers/index.ts
import { MistralProvider } from "./mistral";

// Add to the PROVIDERS array:
export const PROVIDERS: LLMProvider[] = [
  AnthropicProvider,
  OpenAIProvider,
  GoogleProvider,
  MistralProvider,   // ← add here
];
```

That's it. The Settings page will automatically show the new provider.

## Important notes

- Always set `signal` correctly for streaming — check `signal?.aborted` in the stream loop and break early
- The `complete()` method is called by the learning extractor — it only needs to return text, no tool calls needed
- For streaming tool calls: accumulate the full args before yielding, since they arrive in chunks
- `dangerouslyAllowBrowser: true` is needed for any SDK that checks for browser environments (Anthropic, OpenAI)
