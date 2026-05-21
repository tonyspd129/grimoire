# Contributing to Grimoire

**Questions? Join the [Discord community](https://discord.gg/MmXZVqMbU)** — `#contributors` for PR discussion, `#skills-library` to share or request built-in skills.

---

## Before You Open a PR

**Open a GitHub Issue first.** Describe what you want to fix or build and wait for acknowledgement before writing code. This prevents duplicate work and ensures your contribution is in scope.

Exception: built-in skill `.md` files do not need a prior issue.

---

## What We Will Merge

| Contribution | Bar |
|---|---|
| New LLM provider | Full `LLMProvider` implementation — `stream()`, `complete()`, `testConnection()` all working with a real API key |
| Built-in skill | Genuinely useful, procedural, ≤100 char description, tested against real agent tasks |
| Bug fix | Fixes a real, reproducible bug. Links to the issue. Includes a test if the bug was testable. |
| New agent tool | Implements `AgentTool`, has a Rust command if needed, tool definition is accurate for the LLM |
| UI page | Substantially complete, wired to real data, not a visual stub |
| Learning wiring | Connects an existing module to the agent loop — must be end-to-end, not partial |
| Performance improvement | Measurable, not speculative |
| Documentation | Corrects something wrong or missing. Not padding. |

---

## What We Will NOT Merge

These PRs will be closed immediately without review:

- **Whitespace, formatting, or punctuation changes** with no functional effect
- **Typo fixes** in comments, variable names, or strings that don't affect behavior (exception: docs with factual errors)
- **Renaming things** without a clear reason stated in the PR
- **Adding comments** that describe what the code already clearly does
- **Partial implementations** — stubs, TODOs, or "foundation for future work"
- **Duplicate PRs** — same change opened multiple times
- **PRs without a linked issue** (except skills) — if no issue exists, open one first
- **Out-of-scope features** — servers, SaaS, RAG/vector DBs, code editors, multi-agent orchestration
- **Dependency bumps** — handled by Dependabot automatically
- **AI-generated code without review** — generated code must be read, tested, and understood by the author before submitting. Submitting generated code you cannot explain will result in the PR being closed.
- **`src/lib/providers/types.ts` modifications** — this file is frozen. Any PR touching it is closed.
- **Direct pushes to `main`** — all changes go through PRs and review

---

## What Good Looks Like

A good PR:
- Fixes one specific thing or adds one complete feature
- Has a description that explains WHY, not just WHAT
- Shows evidence it was tested (screenshot, test output, or explicit test steps)
- Passes all CI checks before asking for review
- Has conventional commit messages (`feat(providers): add Mistral provider`)

A bad PR:
- Changes 3 unrelated things
- Has a description like "fix stuff" or "improve code"
- Has no tests and no evidence of local testing
- Fails CI and asks the maintainer to figure out why

---

## The Three Ways to Contribute

### 1. Add a new LLM provider

Implement the `LLMProvider` interface in `src/lib/providers/types.ts`. **Never modify `types.ts`** — only implement it.

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

See [docs/adding-a-provider.md](docs/adding-a-provider.md) for the full walkthrough.

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
- `description` must be ≤100 characters
- `name` must be kebab-case and unique across all built-in skills
- Content must be procedural and tested — not copied from documentation

See [docs/adding-a-skill.md](docs/adding-a-skill.md) for examples.

---

### 3. Add a new agent tool

Implement `AgentTool` in `src/lib/agent/tools.ts` and register it.

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
    const result = await invoke<string>("my_rust_command", { arg: args.arg1 });
    return result;
  },
};
```

If the tool needs a Rust backend, add a `#[tauri::command]` in `src-tauri/src/commands/tools.rs` and register in `lib.rs`.

See [docs/adding-a-tool.md](docs/adding-a-tool.md).

---

## Code Conventions

- **TypeScript strict mode** — no `any` except in legacy spots, no `// @ts-ignore`
- **No inline imports** — top-level only, no dynamic `import()` inside functions
- **Rust** — run `cargo clippy` before pushing; fix all warnings
- **No new npm dependencies** without prior discussion in an issue
- **No comments** unless the WHY is non-obvious

## Commit Style

```
feat(providers): add Mistral provider
feat(skills): add rust-error-handling skill
fix(agent): handle stream abort correctly
fix(db): prevent stmt lifetime issue in get_memories
refactor(chat): extract ToolBlock into its own component
```
