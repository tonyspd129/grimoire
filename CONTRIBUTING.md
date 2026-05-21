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

## Ways to Contribute

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

Open providers: Ollama, Groq, Mistral, OpenRouter, Cohere. See [docs/adding-a-provider.md](docs/adding-a-provider.md).

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

Open skills: `kubernetes-ops`, `rust-debugging`, `python-async`, `terraform-ops`, `typescript-patterns`. See [docs/adding-a-skill.md](docs/adding-a-skill.md).

---

### 3. Add a new agent tool

Implement `AgentTool` in `src/lib/agent/tools.ts` and register it. If the tool needs system access, add a `#[tauri::command]` in `src-tauri/src/commands/tools.rs` and register in `lib.rs`.

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

See [docs/adding-a-tool.md](docs/adding-a-tool.md).

---

### 4. Fix a bug

Check the [issue tracker](https://github.com/tonyspd129/grimoire/issues) for bugs tagged `confirmed`. Known open bugs from the codebase:

- **Model selection ignored** — `anthropic.ts`, `openai.ts`, `google.ts` hardcode model names instead of reading from config
- **`search_files` grep pattern malformed** — argument order wrong in `src-tauri/src/commands/tools.rs`
- **`execute_bash` timeout not applied** — `timeout_secs` parameter accepted but never used
- **Google provider ignores tools** — `tools` array passed to `GoogleProvider.stream()` but never used; agent cannot call tools when Google is selected
- **Memory token budget not enforced** — `memory_token_budget` config is saved but `buildSystemPrompt()` never reads it

Every bug fix must link to a confirmed issue and include a test if the bug is reproducible in a unit test.

---

### 5. Build a UI page

Two pages are incomplete. Both have data fully available from Rust via `invoke()` — this is a pure React/TypeScript task.

**Skills page** (`src/pages/Skills.tsx`):
- Browse all skills (built-in + user-created) with filter by category and status
- Confidence bars and usage count display
- Pending Review tab: accept → sets status to `active`, reject → sets status to `archived`
- Upload skill button: parse a user-provided `.md` file and call `invoke("save_skill")`
- Skill detail view with full content

**Memory page** (`src/pages/Memory.tsx`):
- Display all memories grouped by type: Preferences, Expertise, Projects, Corrections, Patterns
- Confidence bars per entry
- Delete individual entries via `invoke("delete_memory")`
- Export all as JSON
- Clear all with confirmation dialog

Data commands already available: `get_skills`, `save_skill`, `update_skill`, `delete_skill`, `get_memories`, `save_memory`, `update_memory`, `delete_memory`.

---

### 6. Wire the learning loop

The micro-learning system is fully written but never called. This is the most impactful open task.

**What exists:**
- `src/lib/learning/extractor.ts` — `runMicroLearning(messages, provider, apiKey)` runs two parallel LLM calls and returns `{ skill, memoryOps }`
- All Rust DB commands: `save_skill`, `save_memory`, `save_extraction`, `update_skill`

**What needs building:**
- In `src/pages/Chat.tsx`: after a conversation ends with ≥5 messages, call `runMicroLearning()` asynchronously
- Check `learning_enabled` config before running
- If `skill.confidence >= auto_save_threshold` → `invoke("save_skill")` + show toast notification
- If `skill.confidence < auto_save_threshold` → `invoke("save_skill", { status: "draft" })` + show review modal
- Apply each `MemoryOperation` → `invoke("save_memory")` / `invoke("update_memory")`
- Log the extraction attempt via `invoke("save_extraction")`

**UI components needed:**
- Learning toast (bottom-right, shows skill name + confidence + Preview/Dismiss)
- Skill review modal (shows draft skill content, Accept / Reject actions)

---

### 7. Implement meso-learning (weekly)

Background job that runs every 7 sessions. Does not require user interaction.

File to create: `src/lib/learning/meso.ts`

Tasks:
- Fetch all skills from DB and detect overlapping/duplicate skills (same triggers, similar descriptions) — propose merge or supersede
- Flag skills with `fail_count >= 3` for user review
- Consolidate related memory entries (e.g. multiple corrections about the same tool)
- Generate a weekly insight record via `invoke("save_insight")` with: skills learned, memory updates, top skills by usage, skills needing review

Trigger: check `session_count % 7 === 0` on app open. Display the insight card if `invoke("get_latest_insight")` returns an unseen record.

---

### 8. Write tests

Current test coverage only covers provider registry, prompt building, and skill catalog. Open testing tasks:

- **`extractor.ts`** — test skill extraction JSON parsing, invalid JSON handling, empty conversation, null result path
- **`runner.ts`** — test max iterations limit, abort signal, tool execution path, error event
- **`tools.ts`** — test each tool's output formatting, error cases
- **`prompt.ts`** — test token budget enforcement once implemented, corrections ordering
- **Integration** — test full Chat → runAgent → tool → DB round-trip with a mocked provider

Tests live in `src/__tests__/`. Use Vitest. Tauri `invoke()` is mocked in `src/__mocks__/tauri.ts` — extend the mock for new commands.

---

### 9. Improve Rust backend

Rust tasks that don't require TypeScript changes:

- **`execute_bash` timeout** — wrap the `std::process::Command` call with `tokio::time::timeout(Duration::from_secs(timeout_secs))` in `src-tauri/src/commands/tools.rs`
- **`list_dir` size limit** — add a cap (e.g. 500 entries) to prevent listing huge directories from hanging the UI
- **DB migrations** — add a schema version table and migration runner so existing user databases can be upgraded when the schema changes
- **`search_files` pattern fix** — fix the grep argument order so pattern matching works correctly

All Rust changes: run `cargo clippy -- -D warnings` and `cargo test` before submitting.

---

### 10. Documentation

Docs that are missing or incomplete:

- `docs/adding-a-tool.md` — does not exist yet; should mirror `adding-a-provider.md` in depth
- `docs/adding-a-skill.md` — exists but needs more examples across different categories
- Architecture deep-dive — how the ReAct loop, skill catalog, and memory injection interact end-to-end
- Troubleshooting guide — common setup issues (Tauri system deps, snap/glibc conflicts on Ubuntu, API key test failures)

Documentation PRs do not need a prior issue. They must correct or add real information — not reword existing content.

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
