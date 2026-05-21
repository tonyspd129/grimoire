## Linked issue

Closes #<!-- issue number required — open an issue first if one doesn't exist. Exception: built-in skill .md files. -->

## What does this PR do?

<!-- Required: 1-3 sentences. Explain WHY this change is needed, not just what it does. -->

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — code change with no behavior change
- [ ] `docs` — documentation only
- [ ] `ci` — CI/workflow change
- [ ] `skill` — new built-in skill

## Component affected

- [ ] LLM provider (`src/lib/providers/`)
- [ ] Agent core (`src/lib/agent/`)
- [ ] Learning (`src/lib/learning/`)
- [ ] Built-in skill (`src-tauri/resources/skills/`)
- [ ] React UI (`src/pages/` or `src/components/`)
- [ ] Rust backend (`src-tauri/src/`)
- [ ] CI / tooling

## Evidence of testing

<!-- Required: show that this works. Screenshot, test output, or step-by-step test plan. "Looks good" is not evidence. -->

## Checklist

- [ ] I opened a GitHub issue and it was acknowledged before writing this PR (skip for skill `.md` files)
- [ ] This PR does one thing — not multiple unrelated changes
- [ ] `npm run build` passes
- [ ] `cargo check` passes in `src-tauri/`
- [ ] Tested locally with `npm run dev:app`
- [ ] CI passes (do not ask for review if CI is red)
- [ ] No API keys or secrets in the diff
- [ ] `src/lib/providers/types.ts` is unchanged
- [ ] I wrote this code myself and can explain every line if asked
