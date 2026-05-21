# Grimoire — Project Roadmap

> Status: ✅ Done · 🚧 Built but not wired · 🔲 Not started



---

## What Grimoire Is

Grimoire is a **local-first desktop AI agent** built on Tauri 2.x (Rust backend + React/TypeScript frontend). It runs entirely on the user's machine — no server, no account, no telemetry. The only outbound network traffic is from the user's machine to their chosen LLM provider API.

The central idea is that the agent gets smarter with every session through two independent memory systems:

1. **Skill Memory** — *What the agent knows how to do.* Procedural knowledge extracted from sessions and stored as Markdown files. Example: after helping debug a docker-compose issue three times, the agent extracts a reusable "docker-ops" skill that it loads automatically next time.

2. **User Memory** — *Who the user is.* Behavioral memory about preferences, expertise levels, active projects, and corrections. Stored in SQLite. Example: "This user prefers `uv` over `pip`" or "Python: expert, Rust: beginner."

Both memories grow automatically. The agent injects them into every session's system prompt so it gets more useful over time — without the user doing anything.

---

## Core Principles

These principles define what Grimoire is and what it isn't. Every PR is evaluated against them.

**1. Local-first, always**
Zero servers. Zero accounts. Zero telemetry. The only network traffic allowed is machine → LLM provider APIs. No analytics, no crash reporting, no update pings. Users own their data completely.

**2. Skills are never automatically deleted**
A skill that taught the agent to configure nginx is still valid whether it was used yesterday or 6 months ago. Skills are only removed when: (a) the user explicitly archives them, or (b) a better skill supersedes them. Even then, the old skill is kept in the archive, never deleted from the database. Failure does not trigger deletion — it triggers a review prompt.

**3. Clean extension contracts**
New LLM providers go in `src/lib/providers/`. New built-in skills go in `src-tauri/resources/skills/`. New agent tools go in `src/lib/agent/tools.ts`. Core code never imports from specific providers — it works through the `LLMProvider` interface. This makes the codebase safe for OSS contributors to extend without breaking anything.

**4. `src/lib/providers/types.ts` is the frozen public contract**
This file defines the `LLMProvider` interface that all providers implement. It must never be modified by contributors. Changing it would break all existing provider implementations simultaneously. Contributors implement it, never modify it.

**5. Rust for system operations, TypeScript for LLM calls**
Rust handles: SQLite, encrypted config, bash execution, file I/O, directory listing. TypeScript handles: LLM API calls, streaming, agent loop logic, skill extraction, memory analysis. This split is intentional — Rust system ops are safe and sandboxed, TypeScript LLM calls can use provider SDKs without CORS friction (Tauri desktop apps bypass browser CORS restrictions).

**6. Out of scope**
Grimoire is not: a web app, a SaaS product, a RAG/document-ingestion system, a code editor, or a multi-agent orchestrator. PRs that add servers, vector databases, document pipelines, or multi-agent coordination are out of scope and will be closed.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  React Renderer (TypeScript)                                    │
│                                                                 │
│  pages/Chat.tsx          → runAgent()                           │
│  pages/Settings.tsx      → invoke("get_config") / "save_config" │
│  pages/Skills.tsx        → invoke("get_skills")                 │
│  pages/Memory.tsx        → invoke("get_memories")               │
│                                                                 │
│  lib/agent/runner.ts     → ReAct loop, max 15 iterations        │
│  lib/agent/prompt.ts     → system prompt builder                │
│  lib/agent/tools.ts      → tool definitions + dispatch          │
│  lib/agent/skills.ts     → skill catalog builder + formatter    │
│  lib/providers/          → LLM provider implementations         │
│  lib/learning/           → micro-learning (skill + memory)      │
└──────────────────┬──────────────────────────────────────────────┘
                   │ invoke() — Tauri IPC
┌──────────────────▼──────────────────────────────────────────────┐
│  Rust Main Process (Tauri)                                      │
│                                                                 │
│  commands/db.rs          → SQLite CRUD (8 tables)               │
│  commands/config.rs      → AES-256-GCM encrypted config         │
│  commands/tools.rs       → bash, read_file, write_file,         │
│                            search_files, list_dir               │
│  lib.rs                  → app startup, DB init, command reg.   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        SQLite DB at {data_local_dir}/grimoire/grimoire.db
        Config at   {data_local_dir}/grimoire/config.json
        Key at      {data_local_dir}/grimoire/key.bin
```

---

## The Two Memory Systems — In Detail

### Skill Memory

Skills are Markdown files with YAML frontmatter. Built-in skills are bundled with the app in `src-tauri/resources/skills/`. User-created and auto-extracted skills are stored in SQLite.

**Skill file format:**
```markdown
---
name: docker-ops
description: Debug docker-compose service failures and container issues
category: system
triggers: [docker, compose, container, exit, restart, unhealthy, logs]
confidence: 0.82
usage_count: 7
status: validated
---

When docker-compose services fail, always check logs first...
[full procedural content]
```

**Skill lifecycle:**
```
draft      → just extracted, confidence 0.40–0.74, awaiting user review
active     → accepted by user, or auto-saved (confidence ≥ 0.75)
validated  → used successfully 3+ times
expert     → 10+ uses, confidence > 0.90
superseded → a better skill covers the same ground (kept for reference)
archived   → user explicitly removed (kept in history, never auto-deleted)
```

**Confidence scoring:**
```
Initial extraction (LLM output):    0.40 – 0.90
Used + task succeeded:              += 0.10
Used + user corrected:              -= 0.20  (flag for review)
Reinforced (seen in new session):   += 0.10  (max 0.95)
3 consecutive failures:             → review prompt (NOT deleted)
```

**How skills get injected into sessions:**

Mode 1 — Manual: User checks a skill in the sidebar. The full skill content is prepended to the user message before the LLM sees it. No LLM decision involved.

Mode 2 — Automatic (default): The skill catalog (name + description only, ~5–10 tokens per skill) is attached to the system prompt as a Markdown table. The `read_skill` tool is given to the LLM. When the LLM judges a skill relevant to the task, it calls `read_skill(name)` to fetch the full content. A library of 50 skills costs ~300–500 tokens in catalog form. Full content only loads when explicitly fetched.

**Why LLM-driven selection over keyword matching:**
The LLM understands "upstream timing out" = nginx problem without needing a list of trigger keywords. It reads catalog descriptions and makes the same judgment a developer would. No scoring formula, no fragile string matching.

---

### User Memory

Stored in SQLite. Injected into every session's system prompt (max ~400 tokens, priority order).

**Memory types:**

| Type | Example value |
|------|--------------|
| `preference` | "Use uv instead of pip for Python packages" |
| `style` | "Prefers concise responses — code first, explanation after" |
| `expertise` | key: "Python", value: "expert" |
| `pattern` | "Usually works on server-side AI infrastructure" |
| `correction` | "Used docker-compose — user corrected to docker compose (v2)" |
| `project` | "Currently building: trajectoryRL miner on Bittensor SN11" |

**Confidence lifecycle:**
```
New memory (from extraction):     confidence = extractor output (0.6–0.9)
Seen again (reinforcement):       += 0.10  (max 0.95)
Contradicted by user:             -= 0.30
Used in session, no correction:   += 0.05
Time decay:                       -= 0.01 / week
Below 0.15:                       → stale (shown to user for review)
```

**System prompt injection (priority order):**
```
## About This User
Style: Direct and concise. Code first, explanation after if asked.

## Expertise
Python (expert) · TypeScript (strong) · Docker (intermediate) · Rust (beginner)

## Active Projects
- trajectoryRL mining on Bittensor SN11
- Grimoire desktop app (Tauri + React)

## Preferences
- uv over pip for Python
- docker compose (v2) not docker-compose
- TypeScript strict mode

## Recent Corrections (pay attention)
- Use 'ruff' not 'flake8' for Python linting
- Prefer 'pathlib.Path' over 'os.path'
```

---

## The ReAct Agent Loop

Implemented in `src/lib/agent/runner.ts`. Max 15 iterations.

```
User message
    │
    ▼
buildSystemPrompt()
  ├── user memories (preferences, expertise, corrections)
  ├── skill catalog table (name + description only)
  └── working directory
    │
    ▼
provider.stream(messages, systemPrompt, tools, apiKey)
    │
    ├── text_delta  → stream to Chat UI
    ├── tool_call   → capture
    └── stop        → done (no tool call → exit loop)
    │
    ▼ (if tool_call)
executeTool(name, args)
  ├── bash          → invoke("execute_bash")      → Rust
  ├── read_file     → invoke("read_file")          → Rust
  ├── write_file    → invoke("write_file")         → Rust
  ├── search_files  → invoke("search_files")       → Rust
  ├── list_dir      → invoke("list_dir")           → Rust
  └── read_skill    → invoke("get_skills") + filter → in-process
    │
    ▼
Append tool result → loop back to provider.stream()
    │
    ▼ (when no tool call returned)
yield { type: "stop" }
```

The loop runs entirely in the TypeScript renderer. Each tool call crosses the Tauri IPC boundary to Rust for system operations.

---

## The Three Learning Cycles

### Micro-learning (every session ≥5 exchanges) — 🚧 built, not wired

Fires async immediately after a session ends. Two parallel `provider.complete()` calls:

**Call A — Skill Extractor** (`src/lib/learning/extractor.ts`):
```
Input:  serialized conversation transcript
Output: { name, description, category, triggers[], content, confidence } | null
```
Routing:
- confidence ≥ 0.75 → auto-save as `active` + toast notification
- confidence 0.40–0.74 → save as `draft` + show review modal
- confidence < 0.40 → discard

**Call B — Behavior Analyzer** (`src/lib/learning/extractor.ts`):
```
Input:  serialized conversation transcript
Output: MemoryOperation[]
  { op: "add",      type, key, value, confidence, evidence }
  { op: "reinforce", id }
  { op: "correct",  agent_did, user_preferred }
  { op: "update",   id, new_value, confidence }
```

Both calls run concurrently with `Promise.allSettled()` — one failing does not block the other.

**What is not yet wired:**
- `Chat.tsx` does not call `runMicroLearning()` after sessions
- Memory ops returned are not applied to SQLite
- Built-in skills `.md` files are not seeded into SQLite on first launch
- No toast UI component exists yet
- No review modal exists yet

---

### Meso-learning (every 7 sessions) — 🔲 not started

Background job. No user action needed.

1. Skill consolidation: detect duplicates/overlapping skills → propose merge or supersede
2. Skill health check: skills with 3+ consecutive failures → flag for review
3. Memory consolidation: merge related entries, resolve contradictions
4. Generate weekly insight card (shown on next app open)

```
╭──────────────────────────────────────────╮
│  📊 Your Agent — Week of May 13          │
│                                          │
│  Skills learned: 3                       │
│  + async-task-cancellation               │
│  + docker-compose-env-debug              │
│  + nginx-ssl-renewal                     │
│                                          │
│  Updated knowledge about you:            │
│  + You prefer ruff over flake8           │
│  + Rust project started (beginner)       │
│                                          │
│  Most used: git-workflow (8×)            │
│  Needs review: nginx-setup (failed 3×)   │
│                         [Got it]         │
╰──────────────────────────────────────────╯
```

---

### Macro-learning (every 30 sessions) — 🔲 not started

Deep pattern analysis across all sessions.

1. Expertise progression: "Your Docker confidence grew: beginner → intermediate"
2. Recurring gap detection: "You've hit nginx 502 errors 5 times — want a dedicated skill?"
3. Workflow pattern recognition: "You always debug → test → deploy in sequence"
4. Proactive skill suggestion: based on detected gaps
5. Usage report: sessions, skills used, tasks completed

---

## Database Schema (SQLite, Rust)

8 tables. DB file at `{data_local_dir}/grimoire/grimoire.db`.

```sql
-- conversations: one row per chat session
conversations (id TEXT, title TEXT, created_at INTEGER, message_count INTEGER)

-- messages: all turns in all conversations
messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  role TEXT,          -- user | assistant | tool_result
  content TEXT,
  tool_calls TEXT,    -- JSON of tool calls made this turn
  created_at INTEGER
)

-- skills: both built-in and user/extracted skills
skills (
  id TEXT PRIMARY KEY,
  source TEXT,        -- builtin | user
  name TEXT,
  description TEXT,
  category TEXT,
  triggers TEXT,      -- JSON array of keyword triggers
  content TEXT,       -- full markdown body
  status TEXT,        -- draft | active | validated | expert | superseded | archived
  confidence REAL,
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  created_at INTEGER,
  last_used INTEGER
)

-- memories: user behavioral memory
memories (
  id TEXT PRIMARY KEY,
  type TEXT,          -- preference | style | expertise | pattern | correction | project
  key TEXT,
  value TEXT,
  confidence REAL,
  evidence TEXT,      -- quote from conversation that produced this
  created_at INTEGER,
  last_seen INTEGER,
  reinforcement_count INTEGER DEFAULT 0
)

-- skill_sessions: tracks which skills were loaded per conversation
skill_sessions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  skill_id TEXT,
  activated INTEGER DEFAULT 0,  -- did agent actually use this skill?
  succeeded INTEGER,            -- did the approach work? (null = unknown)
  created_at INTEGER
)

-- extractions: audit trail of all micro-learning runs
extractions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  type TEXT,          -- skill | memory
  status TEXT,        -- pending | accepted | rejected | auto_saved
  payload TEXT,       -- JSON of extracted content
  confidence REAL,
  created_at INTEGER
)

-- insights: weekly insight cards
insights (
  id TEXT PRIMARY KEY,
  week_start INTEGER,
  content TEXT,       -- JSON of insight data
  seen INTEGER DEFAULT 0,
  created_at INTEGER
)
```

---

## LLM Provider System

Defined in `src/lib/providers/types.ts` — **never modify this file**.

```typescript
interface LLMProvider {
  readonly id: string           // 'anthropic' | 'openai' | 'google' | ...
  readonly name: string         // shown in Settings UI
  readonly models: Model[]      // available models with context windows

  stream(                       // used by the ReAct agent loop
    messages: Message[],
    systemPrompt: string,
    tools: ToolDefinition[],
    apiKey: string,
    signal?: AbortSignal
  ): AsyncIterable<StreamEvent>

  complete(                     // used by micro-learning extractor
    messages: Message[],
    apiKey: string,
    signal?: AbortSignal
  ): Promise<string>

  testConnection(               // used by Settings page
    apiKey: string
  ): Promise<{ ok: boolean; error?: string }>
}
```

**Currently implemented:**

| Provider | File | Models | Status |
|----------|------|--------|--------|
| Anthropic | `src/lib/providers/anthropic.ts` | Claude Haiku 4.5, Sonnet 4.6, Opus 4.7 | ✅ |
| OpenAI | `src/lib/providers/openai.ts` | GPT-4o, GPT-4o mini, o1 | ✅ |
| Google | `src/lib/providers/google.ts` | Gemini 1.5 Pro, Flash, 2.0 Flash | ✅ |
| Mistral | — | — | 🔲 open |
| Ollama | — | local models via localhost:11434 | 🔲 open |
| Groq | — | Llama 3, Mixtral (fast inference) | 🔲 open |
| OpenRouter | — | unified API for 100+ models | 🔲 open |
| Cohere | — | Command R+ | 🔲 open |

**To add a provider:** implement `LLMProvider` in `src/lib/providers/<name>.ts`, add to `PROVIDERS` array in `index.ts`. No other files need to change. See [docs/adding-a-provider.md](docs/adding-a-provider.md).

---

## Agent Tools

Defined in `src/lib/agent/tools.ts`. Each tool crosses the Tauri IPC boundary to a Rust command.

| Tool | Rust command | Status | Notes |
|------|-------------|--------|-------|
| `bash` | `execute_bash` | ✅ | timeout declared but not implemented |
| `read_file` | `read_file` | ✅ | |
| `write_file` | `write_file` | ✅ | |
| `search_files` | `search_files` | ✅ | capped at 200 matching lines |
| `list_dir` | `list_dir` | ✅ | returns entries with metadata |
| `read_skill` | `get_skills` | ✅ | fetches full skill content on demand |

**To add a tool:** implement `AgentTool` in `tools.ts`, optionally add a `#[tauri::command]` in `src-tauri/src/commands/tools.rs` and register in `lib.rs`. See [docs/adding-a-tool.md](docs/adding-a-tool.md).

---

## Built-in Skills

Bundled with the app in `src-tauri/resources/skills/`. Loaded into SQLite on first launch (seeder not yet implemented).

| Skill | Category | Covers |
|-------|----------|--------|
| `debug-python.md` | coding | tracebacks, exceptions, pdb, common pitfalls | ✅ |
| `git-workflow.md` | coding | branching, merging, rebasing, conflict resolution | ✅ |
| `nginx-setup.md` | system | reverse proxy, SSL, 502/503 debugging, upstream | ✅ |
| `docker-ops.md` | system | docker-compose failures, container logs, volumes | ✅ |
| `sql-query.md` | data | query writing, optimization, indexes, joins | ✅ |
| `bash-scripting.md` | system | shell patterns, loops, cron, automation | ✅ |
| `kubernetes-ops.md` | system | kubectl, pod debugging, rollouts, services | 🔲 |
| `rust-debugging.md` | coding | borrow checker, compiler errors, clippy patterns | 🔲 |
| `python-async.md` | coding | asyncio, task cancellation, event loops | 🔲 |
| `terraform-ops.md` | system | plan/apply, state management, module patterns | 🔲 |
| `typescript-patterns.md` | coding | type narrowing, generics, strict mode patterns | 🔲 |

**To contribute a skill:** drop a `.md` file in `src-tauri/resources/skills/` with valid frontmatter. No code changes needed. See [docs/adding-a-skill.md](docs/adding-a-skill.md).

---

## UI Pages

### Chat (✅ built)

Main agent interface. Sidebar shows conversation list and active skills. Message area streams agent responses with collapsible tool call blocks showing command + output. Abort button cancels the active stream.

### Settings (✅ built)

Provider selection, model picker, API key input with test connection, working directory picker, learning mode toggle, auto-save confidence threshold.

### Skills (🔲 not built)

Browse all skills (built-in + user). Tabs: All / My Skills / Pending Review. Filter by category, sort by confidence or usage. Accept / reject draft skills. Upload a custom `.md` skill. View skill detail with confidence bar and usage stats. Archive or trigger supersede flow.

### Memory (🔲 not built)

View all user memories grouped by type (Preferences, Expertise, Projects, Corrections). Confidence bars. Edit or delete individual entries. Export all memories as JSON. Clear all with confirmation.

---

## CI / DevOps

| Check | Trigger | Status |
|-------|---------|--------|
| Commit message lint (conventional commits) | PR (non-bot) | ✅ |
| PR description length check | PR | ✅ |
| TypeScript type check (`tsc --noEmit`) | push + PR | ✅ |
| Vitest unit tests (18 tests) | push + PR | ✅ |
| Rust `cargo check` + `clippy` + `cargo test` | push + PR | ✅ |
| PR summary + goal alignment (Claude via OpenRouter) | PR | ✅ |
| Dependabot (npm weekly, cargo weekly) | scheduled | ✅ |
| Release automation (release-please) | push to main | ✅ |
| macOS code signing | release | 🔲 |
| Windows installer signing | release | 🔲 |
| Auto-update (Tauri updater plugin) | release | 🔲 |

---

## Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation: Tauri, SQLite, encrypted config, Settings | ✅ Complete |
| 2 | Agent core: ReAct loop, 3 providers, 5 tools, 6 skills, Chat UI | ✅ Complete |
| 2.5 | CI pipeline: commit lint, PR summary, tests, Rust checks | ✅ Complete |
| 3 | Learning wiring: seeder, micro-learning triggers, toast, review modal | 🚧 Code exists, not wired |
| 4 | Skills page + Memory page | 🔲 Not started |
| 5 | Meso-learning: weekly consolidation + insight card | 🔲 Not started |
| 6 | Macro-learning: monthly pattern analysis | 🔲 Not started |
| 7 | Packaging: signing, auto-update, release builds | 🔲 Not started |

---

## What to Pick Up

### Easiest — no Rust, no LLM wiring required

- **Add a built-in skill** — drop a `.md` in `src-tauri/resources/skills/`. See [docs/adding-a-skill.md](docs/adding-a-skill.md).
- **Add an LLM provider** — implement one interface, register it. See [docs/adding-a-provider.md](docs/adding-a-provider.md).
- **Build the Memory page** — pure React. Data: `invoke("get_memories")`, `invoke("delete_memory")`. Design in README.
- **Build the Skills page** — pure React. Data: `invoke("get_skills")`, `invoke("update_skill")`. Filter + sort client-side.

### Medium — TypeScript, some wiring needed

- **Wire micro-learning** — in `Chat.tsx`, after a session closes (≥5 messages), call `runMicroLearning()` from `src/lib/learning/extractor.ts`, apply result ops via `invoke("save_memory")` and `invoke("save_skill")`.
- **Build the learning toast** — bottom-right notification component shown when a skill is auto-saved. Should show name, confidence, and a "Preview / Dismiss" action.
- **Build the skill review modal** — shown for draft skills (confidence 0.40–0.74). Accept → `invoke("update_skill", { status: "active" })`. Reject → `invoke("update_skill", { status: "archived" })`.
- **Built-in skills seeder** — on first app launch, read `resources/skills/*.md` from Tauri's resource path and call `invoke("save_skill")` for each if not already in DB. Can be done in TypeScript using `invoke("get_skills")` to check first.

### Harder — Rust or full-stack feature

- **`execute_bash` timeout** — the `timeout_secs` parameter is accepted but not used. Implement using `tokio::time::timeout` wrapping the `std::process::Command` call in `src-tauri/src/commands/tools.rs`.
- **Meso-learning** — weekly background job in `src/lib/learning/meso.ts`: fetch all skills + extractions, run two LLM calls (consolidation + health check), write an insight record via `invoke("save_insight")`. Trigger: session count mod 7 = 0, checked on app open.
- **Weekly insight card UI** — shown on app open if `invoke("get_latest_insight")` returns an unseen card. Displays skills learned, memory updates, top skills, review alerts.

---

## Good First Issues

If you want to contribute but don't know where to start:

1. **Ollama provider** — `localhost:11434/api/chat`, OpenAI-compatible format. Enables fully offline usage with local models. No API key needed.
2. **Groq provider** — OpenAI-compatible. Known for very fast inference. Popular with developers.
3. **OpenRouter provider** — single API key for 100+ models. Useful for users who want to switch models without managing multiple keys.
4. **kubernetes-ops skill** — `kubectl` debugging, pod log inspection, rollout strategies, service/ingress issues.
5. **rust-debugging skill** — borrow checker error patterns, lifetime annotations, common clippy fixes.
6. **Memory page** — all CRUD already exists in Rust. Pure React build, grouped by type with confidence bars.
7. **Skills page** — browse/filter/search. Data from `invoke("get_skills")`. Accept/reject from pending review tab.
8. **`execute_bash` timeout** — self-contained Rust task. Add `tokio::time::timeout` around the command execution.

---

## Repository Layout

```
grimoire/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # type check, tests, Rust, commit lint
│   │   └── pr-summary.yml      # Claude reviews every PR for goal alignment
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.md
│   │   └── feature.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
│
├── src/                         # React renderer (TypeScript)
│   ├── lib/
│   │   ├── providers/
│   │   │   ├── types.ts         # ← THE CONTRACT. Never modify.
│   │   │   ├── index.ts         # provider registry
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   └── google.ts
│   │   ├── agent/
│   │   │   ├── runner.ts        # ReAct loop
│   │   │   ├── prompt.ts        # system prompt builder
│   │   │   ├── tools.ts         # tool definitions + dispatch
│   │   │   └── skills.ts        # skill catalog builder
│   │   └── learning/
│   │       └── extractor.ts     # micro-learning (skill + behavior)
│   ├── pages/
│   │   ├── Chat.tsx
│   │   ├── Skills.tsx           # 🔲 stub
│   │   ├── Memory.tsx           # 🔲 stub
│   │   └── Settings.tsx
│   └── __tests__/               # Vitest unit tests (18 tests)
│
├── src-tauri/                   # Rust main process
│   ├── src/
│   │   ├── commands/
│   │   │   ├── db.rs            # SQLite: all 8 tables, CRUD commands
│   │   │   ├── config.rs        # AES-256-GCM encrypted config
│   │   │   └── tools.rs         # bash, file, search, list_dir
│   │   ├── lib.rs               # app startup, command registration
│   │   └── main.rs
│   ├── resources/
│   │   └── skills/              # built-in .md skill files
│   └── Cargo.toml
│
├── docs/
│   ├── adding-a-provider.md
│   └── adding-a-skill.md
│
├── ROADMAP.md                   # this file
├── CONTRIBUTING.md
├── AGENTS.md                    # rules for AI agents contributing here
└── README.md
```
