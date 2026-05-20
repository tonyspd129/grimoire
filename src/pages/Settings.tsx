import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CheckCircle, XCircle, Loader, ChevronDown, FolderOpen } from "lucide-react";
import { PROVIDERS } from "../lib/providers";
import type { Config } from "../lib/types";

interface Props {
  config: Config;
  onSave: (config: Config) => void;
}

export function Settings({ config, onSave }: Props) {
  const [form, setForm] = useState<Config>(config);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(config); }, [config]);

  const provider = PROVIDERS.find((p) => p.id === form.provider) ?? PROVIDERS[0];
  const models = provider.models;

  async function handleTestConnection() {
    if (!form.api_key) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await provider.testConnection(form.api_key);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ ok: false, error: err.message ?? String(err) });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await invoke("save_config", { config: form });
      onSave(form);
    } finally {
      setSaving(false);
    }
  }

  async function handleBrowseDir() {
    // Fallback: user types path manually (file picker API requires plugin)
    const dir = prompt("Enter working directory path:", form.working_dir);
    if (dir) setForm({ ...form, working_dir: dir });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>

      {/* Provider */}
      <section className="mb-6">
        <label className="block text-sm text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Model Provider</label>
        <div className="flex gap-2 flex-wrap">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setForm({ ...form, provider: p.id, model: p.models[0].id })}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                form.provider === p.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* Model */}
      <section className="mb-6">
        <label className="block text-sm text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Model</label>
        <div className="relative">
          <select
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-accent)]"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name} — {(m.contextWindow / 1000).toFixed(0)}K ctx</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
        </div>
      </section>

      {/* API Key */}
      <section className="mb-6">
        <label className="block text-sm text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">API Key</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={form.api_key}
            onChange={(e) => { setForm({ ...form, api_key: e.target.value }); setTestResult(null); }}
            placeholder={`Enter your ${provider.name} API key`}
            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)] font-mono"
          />
          <button
            onClick={handleTestConnection}
            disabled={!form.api_key || testing}
            className="px-4 py-2.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm hover:border-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
          >
            {testing ? <Loader className="w-4 h-4 animate-spin" /> : null}
            Test Connection
          </button>
        </div>
        {testResult && (
          <div className={`flex items-center gap-2 mt-2 text-sm ${testResult.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
            {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {testResult.ok ? "Connected successfully" : testResult.error ?? "Connection failed"}
          </div>
        )}
        <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
          Stored with AES-256-GCM encryption. Never leaves your device.
        </p>
      </section>

      {/* Working Directory */}
      <section className="mb-6">
        <label className="block text-sm text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Working Directory</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.working_dir}
            onChange={(e) => setForm({ ...form, working_dir: e.target.value })}
            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)] font-mono"
          />
          <button
            onClick={handleBrowseDir}
            className="px-3 py-2.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Learning */}
      <section className="mb-6">
        <label className="block text-sm text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">Learning</label>
        <div className="space-y-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Learning Mode</div>
              <div className="text-xs text-[var(--color-text-muted)]">Extract skills from sessions automatically</div>
            </div>
            <button
              onClick={() => setForm({ ...form, learning_enabled: !form.learning_enabled })}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.learning_enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.learning_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Auto-save Threshold</div>
              <div className="text-xs text-[var(--color-text-muted)]">Skills above this confidence save automatically</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range" min="0.5" max="1.0" step="0.05"
                value={form.auto_save_threshold}
                onChange={(e) => setForm({ ...form, auto_save_threshold: parseFloat(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm w-8 text-right">{Math.round(form.auto_save_threshold * 100)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Memory Token Budget</div>
              <div className="text-xs text-[var(--color-text-muted)]">Max tokens for user memory in system prompt</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range" min="100" max="800" step="50"
                value={form.memory_token_budget}
                onChange={(e) => setForm({ ...form, memory_token_budget: parseInt(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm w-12 text-right">{form.memory_token_budget}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="mb-8">
        <label className="block text-sm text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">Privacy</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Export Memories", action: () => alert("Export coming soon") },
            { label: "Clear Skill History", action: () => alert("Coming soon") },
            { label: "Reset Everything", action: () => { if (confirm("Reset all data?")) alert("Coming soon"); } },
          ].map((item) => (
            <button key={item.label} onClick={item.action}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] hover:border-[var(--color-text-muted)] bg-[var(--color-surface)]"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium text-sm transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
