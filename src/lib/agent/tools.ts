import { invoke } from "@tauri-apps/api/core";
import type { ToolDefinition } from "../providers/types";
import { getSkillByName } from "./skills";

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: unknown): Promise<string>;
}

// ============================================================================
// Tool definitions
// ============================================================================

const bashTool: AgentTool = {
  name: "bash",
  description: "Execute a bash command in the working directory. Use for running scripts, checking system state, installing packages, etc.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The bash command to run" },
      timeout_secs: { type: "number", description: "Timeout in seconds (default 30)" },
    },
    required: ["command"],
  },
  async execute(args: any) {
    const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>("execute_bash", {
      command: args.command,
      timeoutSecs: args.timeout_secs ?? 30,
    });
    const parts: string[] = [];
    if (result.stdout) parts.push(result.stdout);
    if (result.stderr) parts.push(`[stderr]\n${result.stderr}`);
    if (result.exit_code !== 0) parts.push(`[exit code: ${result.exit_code}]`);
    return parts.join("\n") || "(no output)";
  },
};

const readFileTool: AgentTool = {
  name: "read_file",
  description: "Read the contents of a file at the given absolute path.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute path to the file" },
    },
    required: ["path"],
  },
  async execute(args: any) {
    return invoke<string>("read_file", { path: args.path });
  },
};

const writeFileTool: AgentTool = {
  name: "write_file",
  description: "Write content to a file. Creates parent directories if needed.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute path to the file" },
      content: { type: "string", description: "Content to write" },
    },
    required: ["path", "content"],
  },
  async execute(args: any) {
    await invoke("write_file", { path: args.path, content: args.content });
    return `Written to ${args.path}`;
  },
};

const searchFilesTool: AgentTool = {
  name: "search_files",
  description: "Search for a pattern in files using grep. Returns matching lines with file and line numbers.",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Grep pattern (extended regex)" },
      path: { type: "string", description: "Directory to search in" },
      recursive: { type: "boolean", description: "Search recursively (default true)" },
    },
    required: ["pattern", "path"],
  },
  async execute(args: any) {
    return invoke<string>("search_files", { pattern: args.pattern, path: args.path, recursive: args.recursive ?? true });
  },
};

const listDirTool: AgentTool = {
  name: "list_dir",
  description: "List the contents of a directory with file sizes and modification times.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute path to the directory" },
    },
    required: ["path"],
  },
  async execute(args: any) {
    const entries = await invoke<Array<{ name: string; path: string; is_dir: boolean; size: number }>>("list_dir", { path: args.path });
    return entries.map((e) => `${e.is_dir ? "dir" : "file"}\t${e.name}\t${e.size}b`).join("\n");
  },
};

export const readSkillTool: AgentTool = {
  name: "read_skill",
  description: "Load the full content of a skill to guide your approach to this task.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Skill name from the available skills list" },
    },
    required: ["name"],
  },
  async execute(args: any) {
    const skill = await getSkillByName(args.name);
    if (!skill) return `Skill "${args.name}" not found.`;
    return skill.content;
  },
};

export const BASE_TOOLS: AgentTool[] = [bashTool, readFileTool, writeFileTool, searchFilesTool, listDirTool];
export const SKILL_TOOL: AgentTool = readSkillTool;

export function getToolDefinitions(includeSkillTool: boolean): ToolDefinition[] {
  const tools = [...BASE_TOOLS];
  if (includeSkillTool) tools.push(SKILL_TOOL);
  return tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
}

export async function executeTool(name: string, args: unknown): Promise<string> {
  const allTools = [...BASE_TOOLS, SKILL_TOOL];
  const tool = allTools.find((t) => t.name === name);
  if (!tool) return `Unknown tool: ${name}`;
  try {
    return await tool.execute(args);
  } catch (err: any) {
    return `Error: ${err.message ?? String(err)}`;
  }
}
