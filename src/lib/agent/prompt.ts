import type { Memory } from "../types";
import type { SkillCatalogEntry } from "./skills";
import { formatCatalogForPrompt } from "./skills";

export function buildSystemPrompt(
  memories: Memory[],
  skillCatalog: SkillCatalogEntry[],
  workingDir: string,
  hasSkillCatalog: boolean
): string {
  const sections: string[] = [];

  sections.push(`You are Grimoire, a personal AI agent with tool use capabilities. You can run bash commands, read and write files, and search the filesystem. Always use tools when needed — don't guess at file contents or command output.`);

  // User memory section
  const preferences = memories.filter((m) => m.type === "preference" || m.type === "style");
  const expertise = memories.filter((m) => m.type === "expertise");
  const projects = memories.filter((m) => m.type === "project");
  const corrections = memories.filter((m) => m.type === "correction").slice(0, 5);

  if (preferences.length > 0 || expertise.length > 0 || projects.length > 0 || corrections.length > 0) {
    sections.push("## About This User");

    if (preferences.length > 0) {
      sections.push("**Style & Preferences**");
      sections.push(preferences.map((m) => `- ${m.value}`).join("\n"));
    }

    if (expertise.length > 0) {
      sections.push("**Expertise**");
      sections.push(expertise.map((m) => `${m.key} (${m.value})`).join(" · "));
    }

    if (projects.length > 0) {
      sections.push("**Active Projects**");
      sections.push(projects.map((m) => `- ${m.value}`).join("\n"));
    }

    if (corrections.length > 0) {
      sections.push("**Recent Corrections (pay attention)**");
      sections.push(corrections.map((m) => `- ${m.value}`).join("\n"));
    }
  }

  // Skill catalog section
  if (hasSkillCatalog && skillCatalog.length > 0) {
    sections.push(
      `## Available Skills\nYou have access to the following skills. If any are relevant to the user's request, call \`read_skill(name)\` to load the full content before proceeding.\n\n${formatCatalogForPrompt(skillCatalog)}`
    );
  }

  // Working directory
  if (workingDir) {
    sections.push(`## Working Directory\n${workingDir}`);
  }

  // Tools section
  sections.push(
    `## Tools\nbash, read_file, write_file, search_files, list_dir${hasSkillCatalog ? ", read_skill" : ""}`
  );

  return sections.join("\n\n");
}
