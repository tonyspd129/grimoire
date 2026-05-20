import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../lib/agent/prompt";
import type { Memory } from "../lib/types";

const noMemory: Memory[] = [];
const noSkills: never[] = [];

describe("buildSystemPrompt", () => {
  it("always includes the agent identity", () => {
    const prompt = buildSystemPrompt(noMemory, noSkills, "/home/user", false);
    expect(prompt).toContain("Grimoire");
  });

  it("includes working directory when provided", () => {
    const prompt = buildSystemPrompt(noMemory, noSkills, "/home/user/projects", false);
    expect(prompt).toContain("/home/user/projects");
  });

  it("includes skill catalog when hasSkillCatalog is true and skills are provided", () => {
    const skills = [{ name: "nginx-setup", description: "Configure nginx", category: "system" }];
    const prompt = buildSystemPrompt(noMemory, skills, "/home", true);
    expect(prompt).toContain("nginx-setup");
    expect(prompt).toContain("read_skill");
  });

  it("does not mention read_skill when no skills", () => {
    const prompt = buildSystemPrompt(noMemory, noSkills, "/home", false);
    expect(prompt).not.toContain("read_skill");
  });

  it("injects user preferences into prompt", () => {
    const memories: Memory[] = [
      { id: "1", type: "preference", key: "pkg", value: "Use uv instead of pip", confidence: 0.9, created_at: 0, last_seen: 0, reinforcement_count: 0 },
    ];
    const prompt = buildSystemPrompt(memories, noSkills, "/home", false);
    expect(prompt).toContain("Use uv instead of pip");
  });

  it("injects corrections with high priority section", () => {
    const memories: Memory[] = [
      { id: "2", type: "correction", key: "pkg", value: "Use docker compose not docker-compose", confidence: 0.8, created_at: 0, last_seen: 0, reinforcement_count: 0 },
    ];
    const prompt = buildSystemPrompt(memories, noSkills, "/home", false);
    expect(prompt).toContain("docker compose");
    expect(prompt).toContain("Corrections");
  });
});
