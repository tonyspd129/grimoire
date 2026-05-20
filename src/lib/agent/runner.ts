import type { Message, MessageContent } from "../providers/types";
import type { LLMProvider } from "../providers/types";
import { getToolDefinitions, executeTool } from "./tools";
import { buildSystemPrompt } from "./prompt";
import type { Memory } from "../types";
import type { SkillCatalogEntry } from "./skills";

const MAX_ITERATIONS = 15;

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool_start"; name: string; args: unknown }
  | { type: "tool_result"; name: string; result: string }
  | { type: "stop" }
  | { type: "error"; error: string };

export interface RunAgentOptions {
  provider: LLMProvider;
  apiKey: string;
  history: Message[];
  userMessage: string;
  memories: Memory[];
  skillCatalog: SkillCatalogEntry[];
  manualSkills: string[];
  workingDir: string;
  signal?: AbortSignal;
}

export async function* runAgent(opts: RunAgentOptions): AsyncIterable<AgentEvent> {
  const { provider, apiKey, history, userMessage, memories, skillCatalog, manualSkills, workingDir, signal } = opts;

  const hasSkillCatalog = skillCatalog.length > 0;
  const systemPrompt = buildSystemPrompt(memories, skillCatalog, workingDir, hasSkillCatalog);

  // Inject manually selected skills as a system note before the user message
  let finalUserContent = userMessage;
  if (manualSkills.length > 0) {
    finalUserContent = `[Skills pre-loaded by user: ${manualSkills.join(", ")}]\n\n${userMessage}`;
  }

  const messages: Message[] = [
    ...history,
    { role: "user", content: [{ type: "text", text: finalUserContent }] },
  ];

  const toolDefs = getToolDefinitions(hasSkillCatalog);
  let iterations = 0;

  while (iterations++ < MAX_ITERATIONS) {
    if (signal?.aborted) { yield { type: "stop" }; return; }

    let pendingToolCall: { id: string; name: string; args: unknown } | null = null;
    let assistantText = "";

    for await (const event of provider.stream(messages, systemPrompt, toolDefs, apiKey, signal)) {
      if (signal?.aborted) break;

      if (event.type === "text_delta" && event.delta) {
        assistantText += event.delta;
        yield { type: "text", delta: event.delta };
      } else if (event.type === "tool_call" && event.toolCall) {
        pendingToolCall = event.toolCall;
      } else if (event.type === "error") {
        yield { type: "error", error: event.error ?? "Unknown error" };
        return;
      } else if (event.type === "stop") {
        break;
      }
    }

    if (!pendingToolCall) {
      // Assistant finished without a tool call — we're done
      yield { type: "stop" };
      return;
    }

    // Build assistant message with what we have
    const assistantContent: MessageContent[] = [];
    if (assistantText) assistantContent.push({ type: "text", text: assistantText });
    assistantContent.push({ type: "tool_use", id: pendingToolCall.id, name: pendingToolCall.name, input: pendingToolCall.args });
    messages.push({ role: "assistant", content: assistantContent });

    // Execute tool
    yield { type: "tool_start", name: pendingToolCall.name, args: pendingToolCall.args };
    const result = await executeTool(pendingToolCall.name, pendingToolCall.args);
    yield { type: "tool_result", name: pendingToolCall.name, result };

    // Append tool result
    messages.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: pendingToolCall.id, content: result }],
    });
  }

  yield { type: "error", error: "Max iterations reached" };
}
