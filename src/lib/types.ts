// Shared types used across the app

export interface Memory {
  id: string;
  type: "preference" | "style" | "expertise" | "pattern" | "correction" | "project";
  key: string;
  value: string;
  confidence: number;
  evidence?: string;
  created_at: number;
  last_seen: number;
  reinforcement_count: number;
}

export interface Config {
  provider: string;
  model: string;
  api_key: string;
  working_dir: string;
  learning_enabled: boolean;
  auto_save_threshold: number;
  memory_token_budget: number;
}

export type Page = "chat" | "skills" | "memory" | "settings";
