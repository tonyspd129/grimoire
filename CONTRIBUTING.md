# Contributing to Grimoire

**Questions? Join the [Discord community](https://discord.gg/MmXZVqMbU)** — `#contributors` for PR discussion, `#skills-library` to share or request built-in skills.


## What Grimoire is

Grimoire is a local-first desktop AI agent built on Tauri (Rust + React). It has two memory systems:
- **Skill Memory** — procedural knowledge the agent uses to accomplish tasks (stored as `.md` files)
- **User Memory** — behavioral memory about the user's preferences, expertise, and corrections (stored in SQLite)

Both grow automatically from sessions. Skills are never deleted — only superseded by better ones or explicitly archived.

The agent uses a ReAct loop with 5 tools: bash, read_file, write_file, search_files, list_dir. Plus `read_skill` — the key to lazy skill loading: the LLM reads the skill catalog and fetches full content on demand.

## Architecture

```
src/lib/providers/     ← LLM provider implementations (THE extension point)
src/lib/agent/         ← ReAct runner, tool dispatch, system prompt builder
src/lib/learning/      ← Micro-learning: skill extractor + behavior analyzer
src/pages/             ← React pages: Chat, Skills, Memory, Settings
src-tauri/src/         ← Rust: SQLite, encrypted config, bash/file tools
src-tauri/resources/skills/  ← Built-in skill .md files
```

## Running locally

```bash
# Prerequisites: Rust, Node 18+, Tauri system deps
# https://tauri.app/guides/prerequisites

git clone https://github.com/YOUR_ORG/grimoire
cd grimoire
npm install
npm run tauri dev
```

## The Three Ways to Contribute

---

### 1. Add a new LLM provider

Implement the `LLMProvider` interface in `src/lib/providers/types.ts`. This is the main OSS extension point — **never modify `types.ts` itself**, only implement it.

```typescript
// src/lib/providers/mistral.ts
import type { LLMProvider, Model, Message, StreamEvent, ToolDefinition } from "./types";

export const MistralProvider: LLMProvider = {
  id: "mistral",
  name: "Mistral",
  models: [
    { id: "mistral-large-latest", name: "Mistral Large", contextWindow: 128000, maxTokens: 8192 },
  ],

  async *stream(messages, systemPrompt, tools, apiKey, signal) {
    // your streaming implementation
  },

  async complete(messages, apiKey) {
    // used by the learning extractor
  },

  async testConnection(apiKey) {
    // return { ok: true } or { ok: false, error: "..." }
  },
};
```

Then register in `src/lib/providers/index.ts`:
```typescript
import { MistralProvider } from "./mistral";
export const PROVIDERS = [AnthropicProvider, OpenAIProvider, GoogleProvider, MistralProvider];
```

See [docs/adding-a-provider.md](docs/adding-a-provider.md) for a full walkthrough.

---

### 2. Contribute a built-in skill

Drop a `.md` file in `src-tauri/resources/skills/`. No code changes needed.

```markdown
---
name: my-new-skill
description: One sentence ≤100 chars — shown in the LLM catalog
category: coding | system | data | research | security | general
triggers: [keyword1, keyword2, keyword3]
---

Full skill content here. Write it as a guide for the agent.
Be specific, procedural, and focused on what actually works.
```

**Rules:**
- `description` must be ≤100 characters (shown in the skill catalog to the LLM)
- `name` must be kebab-case and unique across all built-in skills
- Content should be technique-focused, not tool documentation

See [docs/adding-a-skill.md](docs/adding-a-skill.md) for examples.

---

### 3. Add a new agent tool

Implement `AgentTool` in `src/lib/agent/tools.ts` and register it in `BASE_TOOLS` or as a special tool.

```typescript
const myTool: AgentTool = {
  name: "my_tool",
  description: "One sentence describing what this tool does",
  parameters: {
    type: "object",
    properties: {
      arg1: { type: "string", description: "..." },
    },
    required: ["arg1"],
  },
  async execute(args: any) {
    // Use invoke() for Tauri commands, or make direct web calls
    const result = await invoke<string>("my_rust_command", { arg: args.arg1 });
    return result;
  },
};
```

If the tool needs a Rust backend, add a `#[tauri::command]` in `src-tauri/src/commands/tools.rs` and register it in `lib.rs`.

See [docs/adding-a-tool.md](docs/adding-a-tool.md) for the full guide.

---

## Code conventions

- **TypeScript strict mode** — no `any` except in legacy spots, no `// @ts-ignore`
- **No inline imports** — top-level imports only, no dynamic `import()` inside functions
- **Rust** — run `cargo clippy` before pushing; fix all warnings
- **No new npm dependencies** without discussion in an issue first (bundle size matters)
- **No comments** unless the WHY is non-obvious (the what is in the code)

## PR checklist

```
[ ] npm run build passes (TypeScript)
[ ] cargo check passes (Rust)
[ ] Tested locally with npm run tauri dev
[ ] For new providers: testConnection() works with a real key
[ ] For new skills: description ≤ 100 chars, content is procedural
[ ] For new tools: tool definition shown to LLM is accurate
[ ] No API keys or secrets committed
[ ] CONTRIBUTING.md or docs/ updated if adding a provider/tool
```

## Commit style

```
feat(providers): add Mistral provider
feat(skills): add rust-error-handling skill
fix(agent): handle stream abort correctly
fix(db): prevent stmt lifetime issue in get_memories
refactor(chat): extract ToolBlock into its own component
```
