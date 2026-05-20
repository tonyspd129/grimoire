import type { LLMProvider, Message } from "../providers/types";

// ============================================================================
// Micro-learning — runs after sessions with >= 5 exchanges
// Two parallel LLM calls: skill extractor + behavior analyzer
// ============================================================================

export interface ExtractedSkill {
  name: string;
  description: string;
  category: string;
  triggers: string[];
  content: string;
  confidence: number;
}

export interface MemoryOperation {
  op: "add" | "reinforce" | "correct" | "update";
  type?: string;
  key?: string;
  value?: string;
  confidence?: number;
  evidence?: string;
  id?: string;
  new_value?: string;
  agent_did?: string;
  user_preferred?: string;
}

const SKILL_EXTRACTOR_PROMPT = `Analyze this conversation and extract ONE reusable agent skill if a clear, generalizable technique was demonstrated.

A good skill is:
- A technique the agent used that would apply to SIMILAR future tasks
- Procedural knowledge (how to debug X, how to set up Y, how to recover Z)
- NOT conversation-specific facts

Output valid JSON only, no explanation:
{
  "name": "kebab-case-name",
  "description": "One sentence, ≤100 chars, suitable for an LLM catalog",
  "category": "coding|system|data|research|security|general",
  "triggers": ["keyword1", "keyword2"],
  "content": "Full markdown skill content with step-by-step procedure...",
  "confidence": 0.0-1.0
}

If no skill worth extracting, output: null`;

const BEHAVIOR_ANALYZER_PROMPT = `Analyze this conversation for signals about the user's preferences, expertise, and behavior.

Output a JSON array of memory operations (empty array [] if nothing notable):
[
  { "op": "add", "type": "preference|style|expertise|pattern|correction|project", "key": "brief key", "value": "what to remember", "confidence": 0.6-0.9, "evidence": "quote from conversation" },
  { "op": "reinforce", "id": "existing-memory-id" },
  { "op": "correct", "agent_did": "what agent did wrong", "user_preferred": "what user wanted instead" },
  { "op": "update", "id": "existing-id", "new_value": "updated value", "confidence": 0.7 }
]

Focus on: tool preferences, code style, communication style, expertise level signals, active projects, corrections to agent behavior.
Ignore: task-specific details that don't generalize.`;

function serializeConversation(messages: Message[]): string {
  return messages
    .map((m) => {
      const role = m.role === "assistant" ? "Agent" : "User";
      const text = m.content
        .filter((c) => c.type === "text")
        .map((c) => (c as any).text)
        .join("\n");
      return `[${role}]\n${text}`;
    })
    .join("\n\n---\n\n");
}

export async function runMicroLearning(
  messages: Message[],
  provider: LLMProvider,
  apiKey: string,
  signal?: AbortSignal
): Promise<{ skill: ExtractedSkill | null; memoryOps: MemoryOperation[] }> {
  if (messages.length < 5) return { skill: null, memoryOps: [] };

  const conversationText = serializeConversation(messages);

  const [skillResult, behaviorResult] = await Promise.allSettled([
    provider.complete(
      [{ role: "user", content: [{ type: "text", text: `<conversation>\n${conversationText}\n</conversation>\n\n${SKILL_EXTRACTOR_PROMPT}` }] }],
      apiKey,
      signal
    ),
    provider.complete(
      [{ role: "user", content: [{ type: "text", text: `<conversation>\n${conversationText}\n</conversation>\n\n${BEHAVIOR_ANALYZER_PROMPT}` }] }],
      apiKey,
      signal
    ),
  ]);

  let skill: ExtractedSkill | null = null;
  if (skillResult.status === "fulfilled") {
    try {
      const parsed = JSON.parse(skillResult.value.trim());
      if (parsed && typeof parsed === "object" && parsed.name) skill = parsed as ExtractedSkill;
    } catch {}
  }

  let memoryOps: MemoryOperation[] = [];
  if (behaviorResult.status === "fulfilled") {
    try {
      const parsed = JSON.parse(behaviorResult.value.trim());
      if (Array.isArray(parsed)) memoryOps = parsed;
    } catch {}
  }

  return { skill, memoryOps };
}
