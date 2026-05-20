import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Trash2, RefreshCw } from "lucide-react";
import type { Memory } from "../lib/types";

const TYPE_LABELS: Record<string, string> = {
  preference: "Preferences",
  style: "Style",
  expertise: "Expertise",
  pattern: "Patterns",
  correction: "Corrections",
  project: "Projects",
};

const TYPE_ORDER = ["preference", "style", "expertise", "project", "correction", "pattern"];

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "var(--color-success)" : pct >= 50 ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-[var(--color-border)]">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full" />
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">{pct}%</span>
    </div>
  );
}

export function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeTab, setActiveTab] = useState<string>("preference");
  const [loading, setLoading] = useState(true);

  async function loadMemories() {
    setLoading(true);
    try {
      const all = await invoke<Memory[]>("get_memories", {});
      setMemories(all);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMemories(); }, []);

  async function handleDelete(id: string) {
    await invoke("delete_memory", { id });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  const byType: Record<string, Memory[]> = {};
  for (const m of memories) {
    if (!byType[m.type]) byType[m.type] = [];
    byType[m.type].push(m);
  }

  const tabs = TYPE_ORDER.filter((t) => (byType[t]?.length ?? 0) > 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-semibold">Memory</h1>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>{memories.length} entries</span>
          <button onClick={loadMemories} className="p-1.5 hover:text-[var(--color-text)] rounded">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">Loading...</div>
      ) : memories.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
          <div className="text-4xl">🧠</div>
          <div className="text-sm">No memories yet. Start a conversation to begin learning.</div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-3 border-b border-[var(--color-border)]">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 text-sm rounded-t-lg border border-b-0 -mb-px transition-colors ${
                  activeTab === t
                    ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {TYPE_LABELS[t]} ({byType[t]?.length ?? 0})
              </button>
            ))}
          </div>

          {/* Memory list */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              {(byType[activeTab] ?? []).map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] group">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{m.value}</div>
                    {m.evidence && (
                      <div className="text-xs text-[var(--color-text-muted)] mt-1 italic truncate">"{m.evidence}"</div>
                    )}
                    <div className="mt-1.5">
                      <ConfidenceBar value={m.confidence} />
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-[var(--color-danger)] text-[var(--color-text-muted)] transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
