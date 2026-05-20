# Grimoire — Roadmap

> Status legend: ✅ Done · 🔲 Not started · 🚧 Partial (code exists, not wired)

---

## Core Principles

Every contribution must respect these. The PR summary bot checks for violations.

1. **Local-first, always** — zero servers, zero telemetry, zero accounts. LLM traffic goes machine → provider API, nothing else leaves the user's machine.
2. **Skills are never deleted** — only superseded or archived. A skill that worked 6 months ago is still valid.
3. **Clean extension contracts** — providers live in `src/lib/providers/`, skills in `resources/skills/`, tools in `src/lib/agent/tools.ts`. Core code does not know about specific providers.
4. **`src/lib/providers/types.ts` is frozen** — this is the public interface. Never modify it, only implement it.
5. **Rust for system ops, TypeScript for LLM calls** — no LLM calls in Rust, no shell exec in TypeScript.

---

## Status by Area

### Foundation ✅

| Component | File(s) | Status |
|-----------|---------|--------|
| Tauri 2.x scaffold | `src-tauri/` | ✅ |
| SQLite schema (8 tables) | `src-tauri/src/commands/db.rs` | ✅ |
| AES-256-GCM encrypted config | `src-tauri/src/commands/config.rs` | ✅ |
| All Tauri commands (20+) | `src-tauri/src/commands/` | ✅ |
| Settings page + test connection | `src/pages/Settings.tsx` | ✅ |
| CI pipeline | `.github/workflows/ci.yml` | ✅ |

### LLM Providers ✅

| Provider | File | Status |
|----------|------|--------|
| Anthropic (Claude) | `src/lib/providers/anthropic.ts` | ✅ |
| OpenAI | `src/lib/providers/openai.ts` | ✅ |
| Google (Gemini) | `src/lib/providers/google.ts` | ✅ |
| Mistral | — | 🔲 **open** |
| Ollama (local models) | — | 🔲 **open** |
| Groq | — | 🔲 **open** |
| OpenRouter | — | 🔲 **open** |

**To add a provider**: implement `LLMProvider` from `src/lib/providers/types.ts`, register in `index.ts`. See [docs/adding-a-provider.md](docs/adding-a-provider.md).

### Agent Core ✅

| Component | File | Status |
|-----------|------|--------|
| ReAct loop | `src/lib/agent/runner.ts` | ✅ |
| System prompt builder | `src/lib/agent/prompt.ts` | ✅ |
| Tool: bash | `src-tauri/src/commands/tools.rs` | ✅ (timeout not implemented) |
| Tool: read_file | `src-tauri/src/commands/tools.rs` | ✅ |
| Tool: write_file | `src-tauri/src/commands/tools.rs` | ✅ |
| Tool: search_files | `src-tauri/src/commands/tools.rs` | ✅ |
| Tool: list_dir | `src-tauri/src/commands/tools.rs` | ✅ |
| Tool: read_skill | `src/lib/agent/tools.ts` | ✅ |
| Chat page | `src/pages/Chat.tsx` | ✅ |

### Built-in Skills ✅

| Skill | File | Status |
|-------|------|--------|
| debug-python | `resources/skills/debug-python.md` | ✅ |
| git-workflow | `resources/skills/git-workflow.md` | ✅ |
| nginx-setup | `resources/skills/nginx-setup.md` | ✅ |
| docker-ops | `resources/skills/docker-ops.md` | ✅ |
| sql-query | `resources/skills/sql-query.md` | ✅ |
| bash-scripting | `resources/skills/bash-scripting.md` | ✅ |
| kubernetes-ops | — | 🔲 **open** |
| rust-debugging | — | 🔲 **open** |
| python-async | — | 🔲 **open** |
| terraform-ops | — | 🔲 **open** |

**To add a skill**: drop a `.md` file in `src-tauri/resources/skills/`. No code changes. See [docs/adding-a-skill.md](docs/adding-a-skill.md).

---

### Micro-Learning 🚧 (partially built, not wired)

The extraction logic exists. None of it fires yet.

| Component | File | Status |
|-----------|------|--------|
| Skill extractor (LLM call) | `src/lib/learning/extractor.ts` | 🚧 built, not called |
| Behavior analyzer (LLM call) | `src/lib/learning/extractor.ts` | 🚧 built, not called |
| Trigger learning after session | `src/pages/Chat.tsx` | 🔲 |
| Apply memory ops to SQLite | `src/lib/learning/memory.ts` | 🔲 |
| Built-in skills seeder (first run) | `src-tauri/src/lib.rs` | 🔲 |
| Learning toast UI | `src/components/learning/Toast.tsx` | 🔲 |
| Skill review modal | `src/components/learning/ReviewModal.tsx` | 🔲 |

**Priority**: This is the most important missing piece. Completing it closes the learning loop.

Steps to implement:
1. After a session closes (≥5 messages), call `runMicroLearning()` from `extractor.ts`
2. Apply the returned memory ops via `invoke("save_memories", { ops })`
3. If a skill is extracted with confidence ≥ 0.75 → `invoke("save_skill", skill)` + toast
4. If confidence 0.40–0.74 → save as `draft` + review modal
5. On first app launch, seed built-in skills from `resources/skills/` into SQLite

---

### Skills Page 🔲

| Component | File | Status |
|-----------|------|--------|
| Skills page layout | `src/pages/Skills.tsx` | 🔲 |
| Browse/filter/search | — | 🔲 |
| Pending review queue tab | — | 🔲 |
| Accept / reject draft skill | — | 🔲 |
| Upload custom skill (.md) | — | 🔲 |
| Skill detail view | — | 🔲 |
| Supersede / archive flow | — | 🔲 |

---

### Memory Page 🔲

| Component | File | Status |
|-----------|------|--------|
| Memory page layout | `src/pages/Memory.tsx` | 🔲 |
| Preference list with confidence bars | — | 🔲 |
| Expertise map | — | 🔲 |
| Corrections history | — | 🔲 |
| Edit / delete individual entries | — | 🔲 |
| Export all memories | — | 🔲 |
| Clear all memories | — | 🔲 |

---

### Meso-Learning (weekly) 🔲

| Component | File | Status |
|-----------|------|--------|
| Weekly consolidation job | `src/lib/learning/meso.ts` | 🔲 |
| Detect duplicate/overlapping skills | — | 🔲 |
| Propose skill merge or supersede | — | 🔲 |
| Health check (skills with 3+ failures) | — | 🔲 |
| Weekly insight card data generation | — | 🔲 |
| Insight card UI (shown on app open) | — | 🔲 |

---

### Polish / Packaging 🔲

| Item | Status |
|------|--------|
| `execute_bash` timeout (Rust) | 🔲 declared, not implemented |
| macOS code signing | 🔲 |
| Windows installer | 🔲 |
| Auto-update (Tauri updater) | 🔲 |
| Macro-learning (monthly patterns) | 🔲 |

---

## What to Pick Up

### Easiest (no Rust, no LLM wiring)

- **Add a built-in skill** — drop a `.md` in `resources/skills/`. See [docs/adding-a-skill.md](docs/adding-a-skill.md).
- **Add a provider** — implement one interface, register it. See [docs/adding-a-provider.md](docs/adding-a-provider.md).
- **Memory page UI** — pure React, data comes from `invoke("get_memories")`.
- **Skills page UI** — pure React, data comes from `invoke("get_skills")`.

### Medium (TypeScript, some wiring)

- **Trigger micro-learning after session ends** — call `runMicroLearning()` in `Chat.tsx` when a conversation closes, pipe results to SQLite commands.
- **Apply memory ops** — write `applyMemoryOps()` in `src/lib/learning/memory.ts` that takes the behavior analyzer output and calls `invoke("save_memories")`.
- **Learning toast** — component that appears bottom-right when a skill is auto-saved.
- **Skill review modal** — shown when a draft skill needs user approval.

### Harder (Rust or full-stack)

- **Built-in skills seeder** — on first launch, read `resources/skills/*.md` from the Tauri resource path and insert them into SQLite if not already present.
- **execute_bash timeout** — implement actual process timeout in `tools.rs` using `tokio::time::timeout`.
- **Meso-learning loop** — weekly background job with skill dedup and insight card generation.

---

## Good First Issues to Open

If you want to contribute but don't know where to start, these are all self-contained:

1. Add an **Ollama provider** (`localhost:11434/api/chat`, OpenAI-compat) — enables local models
2. Add a **Groq provider** (OpenAI-compat, fast inference) — popular with devs
3. Add a **kubernetes-ops skill** — `kubectl`, pod debugging, rollout issues
4. Add a **rust-debugging skill** — compiler errors, borrow checker, clippy patterns
5. Add a **terraform-ops skill** — plan/apply workflow, state issues, module patterns
6. Build the **Memory page** — it's pure React, all CRUD is already in `invoke("get_memories")`
7. Build the **Skills page** — browse/filter/search, data from `invoke("get_skills")`
8. Implement **execute_bash timeout** in Rust using `tokio::time::timeout`

---

## Architecture Quick Reference

```
User message
    ↓
Chat.tsx → runAgent() [src/lib/agent/runner.ts]
    ↓
buildSystemPrompt()  ← memories (SQLite) + skill catalog
    ↓
provider.stream()    ← whichever provider is configured
    ↓ (ReAct loop)
tool calls → invoke() → Rust commands → filesystem / bash
    ↓
Session ends (≥5 messages)
    ↓
runMicroLearning()   ← [NOT YET WIRED]
    ├─ Skill extractor  → save_skill() or review modal
    └─ Behavior analyzer → save_memories()
```

---

## What Grimoire Is Not

To keep scope clear:

- **Not a web app or SaaS** — desktop only, no server, no accounts
- **Not a RAG system** — no vector DB, no document ingestion pipeline
- **Not a code editor** — no LSP, no syntax highlighting in the agent output
- **Not a multi-agent orchestrator** — one agent, one conversation at a time

PRs that add any of the above will be out of scope and closed.
