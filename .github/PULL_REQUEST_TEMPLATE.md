## What does this PR do?

<!-- Required: 1-3 sentences describing the change and why -->

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — code change with no behavior change
- [ ] `docs` — documentation only
- [ ] `ci` — CI/workflow change
- [ ] `deps` — dependency update

## Component affected

- [ ] LLM provider (`src/lib/providers/`)
- [ ] Agent core (`src/lib/agent/`)
- [ ] Learning (`src/lib/learning/`)
- [ ] Built-in skill (`src-tauri/resources/skills/`)
- [ ] React UI (`src/pages/` or `src/components/`)
- [ ] Rust backend (`src-tauri/src/`)
- [ ] CI / tooling

## Test plan

<!-- What did you do to verify this works? -->

- [ ] `npm run build` passes
- [ ] `cargo check` passes in `src-tauri/`
- [ ] Tested locally with `npm run dev:app`
- [ ] Added/updated tests (if applicable)

## Checklist

- [ ] Commits follow `type(scope): description` format
- [ ] No API keys or secrets in the diff
- [ ] `description` field in any new skill is ≤ 100 characters
- [ ] `LLMProvider` interface in `types.ts` is unchanged (if touching providers)
