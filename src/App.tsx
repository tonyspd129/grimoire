import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MessageSquare, BookOpen, Brain, Settings as SettingsIcon } from "lucide-react";
import { Chat } from "./pages/Chat";
import { SkillsPage } from "./pages/Skills";
import { MemoryPage } from "./pages/Memory";
import { Settings } from "./pages/Settings";
import type { Config, Page } from "./lib/types";
import "./index.css";

const DEFAULT_CONFIG: Config = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  api_key: "",
  working_dir: "",
  learning_enabled: true,
  auto_save_threshold: 0.75,
  memory_token_budget: 400,
};

const NAV = [
  { id: "chat" as Page, icon: MessageSquare, label: "Chat" },
  { id: "skills" as Page, icon: BookOpen, label: "Skills" },
  { id: "memory" as Page, icon: Brain, label: "Memory" },
  { id: "settings" as Page, icon: SettingsIcon, label: "Settings" },
];

export default function App() {
  const [page, setPage] = useState<Page>("chat");
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    invoke<Config>("get_config")
      .then((c) => { setConfig(c); setConfigLoaded(true); })
      .catch(() => { setConfig(DEFAULT_CONFIG); setConfigLoaded(true); });
  }, []);

  if (!configLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
        <div className="animate-spin w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top nav bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-accent)] font-bold text-lg">✦</span>
          <span className="font-semibold text-sm">Grimoire</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              title={label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                page === id
                  ? "bg-[var(--color-surface-2)] text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
        <div className="w-24 flex justify-end">
          {!config.api_key && (
            <button onClick={() => setPage("settings")} className="text-xs text-[var(--color-warning)] hover:underline">
              No API key
            </button>
          )}
        </div>
      </header>

      {/* Page content */}
      <div className="flex-1 flex overflow-hidden">
        {page === "chat" && <Chat config={config} />}
        {page === "skills" && <SkillsPage />}
        {page === "memory" && <MemoryPage />}
        {page === "settings" && <Settings config={config} onSave={setConfig} />}
      </div>
    </div>
  );
}
