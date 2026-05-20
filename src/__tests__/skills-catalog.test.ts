import { describe, it, expect } from "vitest";
import { buildSkillCatalog, formatCatalogForPrompt } from "../lib/agent/skills";
import type { Skill } from "../lib/agent/skills";

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: "1", source: "builtin", name: "test-skill",
    description: "A test skill", category: "coding",
    triggers: "[]", content: "content", status: "active",
    confidence: 0.8, usage_count: 0, success_count: 0, fail_count: 0,
    created_at: 0, last_used: null,
    ...overrides,
  };
}

describe("buildSkillCatalog", () => {
  it("excludes archived skills", () => {
    const skills = [makeSkill({ status: "archived" }), makeSkill({ name: "active-skill", status: "active" })];
    const catalog = buildSkillCatalog(skills);
    expect(catalog.map((c) => c.name)).not.toContain("test-skill");
    expect(catalog.map((c) => c.name)).toContain("active-skill");
  });

  it("excludes superseded skills", () => {
    const skills = [makeSkill({ status: "superseded" })];
    expect(buildSkillCatalog(skills)).toHaveLength(0);
  });

  it("includes expert, validated, active, draft skills", () => {
    const skills = ["expert", "validated", "active", "draft"].map((status) =>
      makeSkill({ name: `${status}-skill`, status })
    );
    const catalog = buildSkillCatalog(skills);
    expect(catalog).toHaveLength(4);
  });
});

describe("formatCatalogForPrompt", () => {
  it("returns empty string for empty catalog", () => {
    expect(formatCatalogForPrompt([])).toBe("");
  });

  it("includes skill name and description in table format", () => {
    const catalog = [{ name: "nginx-setup", description: "Configure nginx", category: "system" }];
    const result = formatCatalogForPrompt(catalog);
    expect(result).toContain("nginx-setup");
    expect(result).toContain("Configure nginx");
    expect(result).toContain("system");
    expect(result).toContain("|");
  });
});
