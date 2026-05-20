import { invoke } from "@tauri-apps/api/core";

export interface Skill {
  id: string;
  source: string;
  name: string;
  description: string;
  category: string;
  triggers: string;
  content: string;
  status: string;
  confidence: number;
  usage_count: number;
  success_count: number;
  fail_count: number;
  created_at: number;
  last_used: number | null;
}

export interface SkillCatalogEntry {
  name: string;
  description: string;
  category: string;
}

export async function loadSkills(source?: string, status?: string): Promise<Skill[]> {
  return invoke<Skill[]>("get_skills", { source, status });
}

export async function getSkillByName(name: string): Promise<Skill | undefined> {
  const skills = await loadSkills();
  return skills.find((s) => s.name === name);
}

export function buildSkillCatalog(skills: Skill[]): SkillCatalogEntry[] {
  return skills
    .filter((s) => s.status !== "archived" && s.status !== "superseded")
    .map((s) => ({ name: s.name, description: s.description, category: s.category }));
}

export function formatCatalogForPrompt(catalog: SkillCatalogEntry[]): string {
  if (catalog.length === 0) return "";
  const header = `| Name | Description | Category |\n|------|-------------|----------|\n`;
  const rows = catalog.map((e) => `| ${e.name} | ${e.description} | ${e.category} |`).join("\n");
  return header + rows;
}

export async function recordSkillUsed(id: string, succeeded?: boolean): Promise<void> {
  const now = Date.now();
  await invoke("update_skill", {
    id,
    usageCount: null,
    successCount: succeeded === true ? null : null,
    failCount: succeeded === false ? null : null,
    lastUsed: now,
  });
  // Increment via a direct call — simpler than passing all fields
  const skills = await loadSkills();
  const skill = skills.find((s) => s.id === id);
  if (!skill) return;
  await invoke("update_skill", {
    id,
    usageCount: skill.usage_count + 1,
    successCount: succeeded === true ? skill.success_count + 1 : null,
    failCount: succeeded === false ? skill.fail_count + 1 : null,
    lastUsed: now,
    status: null,
    confidence: null,
  });
}
