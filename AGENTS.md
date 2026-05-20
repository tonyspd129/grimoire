# Grimoire — Rules for AI Agents

## Critical rules

- **NEVER modify `src/lib/providers/types.ts`** — it is the public provider interface contract. Breaking it breaks all providers.
- **NEVER add dynamic imports** (`import()` inside functions) — top-level imports only.
- **NEVER add an API call in core agent code** — all provider-specific code belongs in `src/lib/providers/<name>.ts`.
- **NEVER commit `.env`, API keys, or `node_modules`**.
- **Run `npm run build` (full output) after every TypeScript change. Fix all errors before committing.**
- **Run `cargo check` in `src-tauri/` after every Rust change. Fix all errors and warnings before committing.**

## Where things live

| What | Where |
|---|---|
| Provider interface (contract) | `src/lib/providers/types.ts` — READ ONLY |
| Provider implementations | `src/lib/providers/<name>.ts` |
| Provider registry | `src/lib/providers/index.ts` |
| Agent ReAct loop | `src/lib/agent/runner.ts` |
| System prompt builder | `src/lib/agent/prompt.ts` |
| Tool definitions + dispatch | `src/lib/agent/tools.ts` |
| Skill loader | `src/lib/agent/skills.ts` |
| Micro-learning | `src/lib/learning/extractor.ts` |
| SQLite CRUD commands | `src-tauri/src/commands/db.rs` |
| Config + encryption | `src-tauri/src/commands/config.rs` |
| File/bash/search tools | `src-tauri/src/commands/tools.rs` |
| Built-in skills | `src-tauri/resources/skills/*.md` |

## Adding a provider (safe procedure)

1. Create `src/lib/providers/<name>.ts`
2. Export a named const that implements `LLMProvider` from `./types`
3. Add to `PROVIDERS` array in `src/lib/providers/index.ts`
4. No other files should change
5. Test with a real API key before committing

## Adding a built-in skill (safe procedure)

1. Create `src-tauri/resources/skills/<name>.md`
2. Frontmatter must have: `name`, `description` (≤100 chars), `category`, `triggers` (array)
3. No code changes needed

## Adding a Rust command (safe procedure)

1. Add the function to the appropriate file in `src-tauri/src/commands/`
2. Annotate with `#[tauri::command]`
3. Register in `src-tauri/src/lib.rs` invoke handler
4. Run `cargo check` — fix all errors before proceeding

## Common mistakes to avoid

- Using `stmt.query_map(...)?.collect()` in Rust — the `?` operator creates temporaries that borrow `stmt`. Use `match` to collect before returning.
- Forgetting `dangerouslyAllowBrowser: true` in Anthropic/OpenAI SDK init (required for Tauri renderer).
- Using `unknown` type in JSX directly — always narrow with `!!` or type assertions first.
- Adding `shell-open` to Tauri features — it doesn't exist in Tauri 2 (use `tauri-plugin-shell` if needed).
