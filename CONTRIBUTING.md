# Contributing to Grimoire

**Questions? Join the [Discord community](https://discord.gg/MmXZVqMbU)** — `#contributors` for PR discussion, `#skills-library` to share or request built-in skills.

---

## Before You Open a PR

- **Search open issues and PRs first.** If someone is already working on the same thing, coordinate rather than duplicate.
- **Wait for issue acknowledgement.** A maintainer will confirm the change is in scope and not already being worked on. PRs opened without a confirmed issue are likely to be closed.
- **Keep scope small.** One bug fix or one feature per PR. Mixed-purpose PRs are hard to review and will be asked to split.

---

## What We Will Merge

| Contribution | Standard |
|---|---|
| New LLM provider | Full `LLMProvider` implementation — `stream()`, `complete()`, `testConnection()` all working with a real API key |
| Built-in skill | Genuinely useful, procedural, ≤100 char description, tested against real agent tasks |
| Bug fix | Fixes a real reproducible bug. Links to the issue. Includes a test if the bug is testable. |
| New agent tool | Implements `AgentTool`, Rust command if needed, tool definition accurate for the LLM |
| UI page | Substantially complete, wired to real data — not a visual stub |
| Learning wiring | Connects an existing module to the agent loop — must be end-to-end, not partial |
| Performance fix | Measurable improvement, not speculative |
| Documentation | Corrects something wrong or missing — not padding |

---

## What We Will NOT Merge

These PRs are closed immediately without review:

- **Whitespace, formatting, or punctuation changes** with no functional effect
- **Typo fixes** in code comments or variable names that don't affect behavior
- **Renaming things** for personal style preference
- **Adding comments** that describe what the code already clearly does
- **Partial implementations** — stubs, TODOs, or "foundation for future work"
- **Duplicate PRs** — same change opened more than once
- **PRs without a linked issue** — open an issue and wait for acknowledgement first (skills exempt)
- **Out-of-scope features** — servers, SaaS, RAG/vector DBs, code editors, multi-agent orchestration (see [ROADMAP.md](ROADMAP.md))
- **Dependency bumps** — handled automatically by Dependabot, not accepted manually
- **AI-generated code the author cannot explain** — generated code must be read, understood, and tested by the author. If asked to explain a section during review and you cannot, the PR is closed.
- **`src/lib/providers/types.ts` modifications** — this file is the frozen public contract. Any PR touching it is closed regardless of content.
- **PRs with failing CI** — fix CI before requesting review, not after

---

## CI Requirements (all must pass before review)

| Check | Command |
|---|---|
| TypeScript type check | `npx tsc --noEmit` |
| Unit tests | `npm test -- --run` |
| Rust check + clippy + tests | `cargo check && cargo clippy -- -D warnings && cargo test` |
| Commit message lint | conventional commits format enforced |

Run these locally before pushing. Do not open a PR with red CI and ask the maintainer to debug it.

---

## What Good Looks Like

**Good PR:**
- Solves one specific problem from a confirmed issue
- Description explains WHY the change is needed
- Includes evidence of testing (screenshot, test output, or explicit steps)
- CI is green when review is requested
- Commits are clean and conventional

**Bad PR:**
- Changes multiple unrelated things
- Description says "fix stuff" or "improve code quality"
- No evidence of local testing
- CI is red
- Author asks maintainer to figure out what's wrong

---

## The Three Ways to Contribute

### 1. Add a new LLM provider

Implement the `LLMProvider` interface from `src/lib/providers/types.ts`. **Never modify `types.ts`** — only implement it.

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

Register in `src/lib/providers/index.ts`:
```typescript
import { MistralProvider } from "./mistral";
export const PROVIDERS = [AnthropicProvider, OpenAIProvider, GoogleProvider, MistralProvider];
```

See [docs/adding-a-provider.md](docs/adding-a-provider.md) for the full walkthrough.

---

### 2. Contribute a built-in skill

Drop a `.md` file in `src-tauri/resources/skills/`. No code changes needed. No prior issue required.

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

Rules:
- `description` must be ≤100 characters
- `name` must be kebab-case and unique across all built-in skills
- Content must be original and procedural — not copied from official documentation
- Test your skill against a real task in the app before submitting

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

If the tool needs a Rust backend, add `#[tauri::command]` in `src-tauri/src/commands/tools.rs` and register in `lib.rs`.

See [docs/adding-a-tool.md](docs/adding-a-tool.md).

---

## Code Conventions

- **TypeScript strict mode** — no `any` except in legacy spots, no `// @ts-ignore`
- **Top-level imports only** — no dynamic `import()` inside functions
- **Rust** — run `cargo clippy -- -D warnings` before pushing; fix all warnings, not just errors
- **No new npm dependencies** without prior discussion in an issue (bundle size matters)
- **No code comments** unless the WHY is non-obvious — the what is in the code

## Commit Style

Commits are linted by CI. Non-conventional commits will fail the check.

```
feat(providers): add Mistral provider
feat(skills): add rust-error-handling skill
fix(agent): handle stream abort correctly
fix(db): prevent stmt lifetime issue in get_memories
refactor(chat): extract ToolBlock into its own component
docs(contributing): clarify PR workflow
```

Valid scopes: `providers`, `agent`, `learning`, `skills`, `chat`, `memory`, `ui`, `settings`, `db`, `config`, `tools`, `ci`, `docs`, `deps`
