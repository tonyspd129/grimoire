import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Check, X, RefreshCw, Star, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import type { Skill } from "../lib/agent/skills";

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-[var(--color-warning)] bg-[var(--color-warning)]/10" },
  active: { label: "Active", color: "text-[var(--color-text-muted)] bg-[var(--color-surface-2)]" },
  validated: { label: "✓ Validated", color: "text-[var(--color-success)] bg-[var(--color-success)]/10" },
  expert: { label: "★ Expert", color: "text-[var(--color-accent)] bg-[var(--color-accent)]/10" },
  superseded: { label: "Superseded", color: "text-[var(--color-text-muted)] bg-[var(--color-surface-2)]" },
  archived: { label: "Archived", color: "text-[var(--color-text-muted)] bg-[var(--color-surface-2)]" },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "var(--color-accent)" : pct >= 60 ? "var(--color-success)" : "var(--color-warning)";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 rounded-full bg-[var(--color-border)]">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full" />
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">{pct}%</span>
    </div>
  );
}

function SkillCard({ skill, onAccept, onReject, onArchive }: {
  skill: Skill;
  onAccept?: () => void;
  onReject?: () => void;
  onArchive?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const badge = STATUS_BADGE[skill.status] ?? STATUS_BADGE.active;

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{skill.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${badge.color}`}>{badge.label}</span>
            <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">{skill.category}</span>
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{skill.description}</div>
          <div className="flex items-center gap-3 mt-2">
            <ConfidenceBar value={skill.confidence} />
            {skill.usage_count > 0 && <span className="text-xs text-[var(--color-text-muted)]">used {skill.usage_count}×</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {skill.status === "draft" && (
            <>
              <button onClick={onAccept} className="p-1.5 rounded hover:bg-[var(--color-success)]/20 text-[var(--color-success)]" title="Accept">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={onReject} className="p-1.5 rounded hover:bg-[var(--color-danger)]/20 text-[var(--color-danger)]" title="Reject">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {skill.status !== "draft" && onArchive && (
            <button onClick={onArchive} className="p-1.5 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]" title="Archive">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-[var(--color-border)] mt-0 pt-3">
          <pre className="text-xs whitespace-pre-wrap text-[var(--color-text-muted)] font-mono leading-relaxed max-h-60 overflow-y-auto">{skill.content}</pre>
        </div>
      )}
    </div>
  );
}

type Tab = "active" | "draft" | "archive";

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tab, setTab] = useState<Tab>("active");
  const [loading, setLoading] = useState(true);

  async function loadSkills() {
    setLoading(true);
    try {
      const all = await invoke<Skill[]>("get_skills", {});
      setSkills(all);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSkills(); }, []);

  async function acceptSkill(id: string) {
    await invoke("update_skill", { id, status: "active", confidence: null, usageCount: null, successCount: null, failCount: null, lastUsed: null });
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, status: "active" } : s));
  }

  async function archiveSkill(id: string) {
    await invoke("update_skill", { id, status: "archived", confidence: null, usageCount: null, successCount: null, failCount: null, lastUsed: null });
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, status: "archived" } : s));
  }

  const activeSkills = skills.filter((s) => ["active", "validated", "expert"].includes(s.status));
  const draftSkills = skills.filter((s) => s.status === "draft");
  const archiveSkills = skills.filter((s) => ["archived", "superseded"].includes(s.status));

  const displayed = tab === "active" ? activeSkills : tab === "draft" ? draftSkills : archiveSkills;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-semibold">Skills</h1>
        <div className="flex items-center gap-2">
          <button onClick={loadSkills} className="p-1.5 hover:text-[var(--color-text)] text-[var(--color-text-muted)] rounded">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white">
            <Plus className="w-3.5 h-3.5" /> Upload Skill
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 border-b border-[var(--color-border)]">
        {([
          { id: "active" as Tab, label: "Active", count: activeSkills.length, icon: <Sparkles className="w-3 h-3" /> },
          { id: "draft" as Tab, label: "Pending Review", count: draftSkills.length, icon: null },
          { id: "archive" as Tab, label: "Archive", count: archiveSkills.length, icon: null },
        ] as const).map(({ id, label, count, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-lg border border-b-0 -mb-px transition-colors ${
              tab === id
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {icon}{label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${id === "draft" && count > 0 ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)]" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="text-center text-[var(--color-text-muted)] py-10">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--color-text-muted)]">
            <div className="text-3xl">{tab === "draft" ? "✨" : tab === "active" ? "📖" : "📦"}</div>
            <div className="text-sm">
              {tab === "draft" ? "No skills pending review" : tab === "active" ? "No active skills yet. Complete sessions to extract skills." : "No archived skills"}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((s) => (
              <SkillCard
                key={s.id}
                skill={s}
                onAccept={s.status === "draft" ? () => acceptSkill(s.id) : undefined}
                onReject={s.status === "draft" ? () => archiveSkill(s.id) : undefined}
                onArchive={s.status !== "draft" ? () => archiveSkill(s.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
