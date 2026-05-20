import { describe, it, expect } from "vitest";
import { PROVIDERS, getProvider } from "../lib/providers/index";

describe("Provider registry", () => {
  it("has at least Anthropic, OpenAI, and Google", () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(ids).toContain("anthropic");
    expect(ids).toContain("openai");
    expect(ids).toContain("google");
  });

  it("every provider has at least one model", () => {
    for (const p of PROVIDERS) {
      expect(p.models.length).toBeGreaterThan(0);
    }
  });

  it("every model has a positive contextWindow", () => {
    for (const p of PROVIDERS) {
      for (const m of p.models) {
        expect(m.contextWindow).toBeGreaterThan(0);
        expect(m.maxTokens).toBeGreaterThan(0);
      }
    }
  });

  it("getProvider throws on unknown id", () => {
    expect(() => getProvider("nonexistent")).toThrow();
  });

  it("getProvider returns the correct provider", () => {
    const p = getProvider("anthropic");
    expect(p.id).toBe("anthropic");
    expect(p.name).toBe("Anthropic");
  });

  it("all provider ids are unique", () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all provider ids are lowercase kebab-case", () => {
    for (const p of PROVIDERS) {
      expect(p.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});
