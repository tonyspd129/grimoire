# Grimoire ✦

> The spellbook that learns. Skills are spells. The agent casts them. You build the book.

[![Discord](https://img.shields.io/discord/MmXZVqMbU?label=Discord&logo=discord&logoColor=white&color=5865F2)](https://discord.gg/MmXZVqMbU)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Grimoire is a local-first desktop AI agent that grows smarter with every session. It learns **what you know how to do** (Skill Memory) and **who you are** (User Memory) — and gets better at both without a server, without a subscription, without your data leaving your machine.

---

## What it does

| Feature | How it works |
|---|---|
| **Agent with tools** | ReAct loop: runs bash commands, reads/writes files, searches the filesystem |
| **Skill Memory** | Markdown skills injected into the system prompt. LLM reads a catalog and loads relevant skills on demand via `read_skill` tool |
| **User Memory** | Semantic memory about your preferences, expertise, projects, and corrections — injected into every session |
| **Automatic learning** | After each session (≥5 exchanges), extracts new skills + updates user memory with two parallel LLM calls |
| **Manual skill control** | Select skills from the sidebar to force-inject them before the LLM sees your message |
| **Multi-provider** | Anthropic, OpenAI, Google — your API key, your traffic, your cost |
| **Zero server** | 100% local. The only network traffic is your machine → LLM provider APIs |

---

## Stack

- **Desktop**: Tauri 2.x (~8MB bundle, uses OS webview)
- **UI**: React + TypeScript + Tailwind CSS
- **Database**: SQLite via `rusqlite` (Rust, single local file)
- **Encryption**: AES-256-GCM (Rust) for API key storage
- **LLM calls**: TypeScript SDKs from the renderer — no CORS issues in desktop apps

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- System deps for Tauri: [tauri.app/guides/prerequisites](https://tauri.app/guides/prerequisites)

### Run locally

```bash
git clone https://github.com/YOUR_ORG/grimoire
cd grimoire
npm install
npm run tauri dev
```

### Build for release

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/`

---

## How the learning works

**Micro-learning** (after every session ≥5 exchanges):
1. Skill Extractor LLM call → extracts a reusable skill if one is visible
2. Behavior Analyzer LLM call → updates user memory (preferences, corrections, expertise)
- Skills with confidence ≥ auto_save_threshold → saved automatically (status: `active`)
- Skills below threshold → saved as `draft`, shown in review queue

**Skill lifecycle**: `draft → active → validated (3+ uses) → expert (10+ uses)`

Skills are **never deleted** unless you archive them or a better skill replaces them.

**User memory** uses confidence scoring — reinforced when seen again, penalized on contradiction, decays slightly over time so stale preferences fade.

---

## Skill selection

**Manual**: Check skills in the sidebar. They are injected in full before the LLM sees your message.

**Automatic (default)**: The skill catalog (name + description only, ~5 tokens/skill) is in the system prompt. The LLM calls `read_skill(name)` when a skill is relevant. You see which skills were loaded in the sidebar after each session.

---

## Community

**[Join the Discord](https://discord.gg/MmXZVqMbU)** — share your skills library, get help with setup, discuss features, or just hang out.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Three ways to contribute:**

1. **Add a provider** — implement `LLMProvider` in `src/lib/providers/`
2. **Add a skill** — drop a `.md` file in `src-tauri/resources/skills/`
3. **Add a tool** — implement `AgentTool` in `src/lib/agent/tools.ts`

---

## License

MIT
