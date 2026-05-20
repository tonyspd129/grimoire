# Adding a built-in skill

Built-in skills are `.md` files in `src-tauri/resources/skills/`. No code changes needed.

## File format

```markdown
---
name: my-skill-name        # kebab-case, unique, no spaces
description: One sentence ≤100 characters — shown in the LLM skill catalog
category: coding            # coding | system | data | research | security | general
triggers: [keyword1, keyword2, keyword3]
---

# Skill content (shown to the LLM in full when it calls read_skill)

Write step-by-step procedural guidance here. Think: what would a senior
engineer want to know to accomplish this task reliably?

## Good content includes:
- Concrete commands with explanations
- Common failure modes and fixes
- Decision points ("if X then Y, else Z")
- Exact flags and arguments that matter

## Avoid:
- General advice ("make sure to test")  
- Tool documentation (the LLM already knows the API)
- Task-specific details that don't generalize
```

## Description rules

The `description` field is shown in the **skill catalog** that the LLM reads to decide which skills to load. Keep it:
- **≤100 characters** (hard limit enforced at review)
- **Specific** — "Debug nginx 502 errors and upstream timeouts" not "Nginx help"
- **Action-oriented** — starts with what the skill helps accomplish

## Category guide

| Category | Use for |
|---|---|
| `coding` | Language-specific debugging, testing, code patterns |
| `system` | OS config, services, networking, containerization |
| `data` | Databases, data processing, querying, schemas |
| `research` | Information gathering, analysis, summarization |
| `security` | Security testing, hardening, audit |
| `general` | Doesn't fit the above |

## Example skill

```markdown
---
name: postgres-slow-query
description: Diagnose slow PostgreSQL queries using EXPLAIN ANALYZE and index analysis
category: data
triggers: [postgres, postgresql, slow, query, index, explain, performance]
---

## Diagnosing slow PostgreSQL queries

### Step 1: Identify slow queries

```sql
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Step 2: Run EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

Look for:
- `Seq Scan` on large tables → add an index
- `Hash Join` with large row counts → check join conditions
- High `Buffers: shared hit` → query is cache-bound

[... rest of content]
```
