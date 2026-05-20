import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Send, Square, Plus, ChevronDown, ChevronRight, Terminal, BookOpen } from "lucide-react";
import { runAgent } from "../lib/agent/runner";
import { loadSkills as fetchSkills, buildSkillCatalog } from "../lib/agent/skills";
import { buildSystemPrompt } from "../lib/agent/prompt";
import { getProvider } from "../lib/providers";
import type { Config, Memory } from "../lib/types";
import type { Skill } from "../lib/agent/skills";
import type { Message } from "../lib/providers/types";
import type { AgentEvent } from "../lib/agent/runner";

interface Props {
  config: Config;
}

// ============================================================================
// Message display types
// ============================================================================

interface UIMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  text?: string;
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: string;
  toolExpanded?: boolean;
  streaming?: boolean;
}

// ============================================================================
// Components
// ============================================================================

function ToolBlock({ msg, onToggle }: { msg: UIMessage; onToggle: () => void }) {
  const isExpanded = msg.toolExpanded;
  return (
    <div className="my-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-mono overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-surface-2)] text-left">
        <Terminal className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0" />
        <span className="text-[var(--color-accent)] font-semibold">{msg.toolName}</span>
        {!!msg.toolArgs && typeof msg.toolArgs === "object" && "command" in (msg.toolArgs as object) && (
          <span className="text-[var(--color-text-muted)] truncate">$ {String((msg.toolArgs as Record<string, unknown>).command)}</span>
        )}
        <span className="ml-auto text-[var(--color-text-muted)]">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] px-3 py-2">
          {!!msg.toolArgs && (
            <div className="text-[var(--color-text-muted)] mb-2 whitespace-pre-wrap">
              {JSON.stringify(msg.toolArgs, null, 2)}
            </div>
          )}
          {msg.toolResult && (
            <pre className="text-[var(--color-text)] whitespace-pre-wrap max-h-40 overflow-y-auto">{msg.toolResult}</pre>
          )}
          {!msg.toolResult && <div className="text-[var(--color-text-muted)] animate-pulse">Running...</div>}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, onToolToggle }: { msg: UIMessage; onToolToggle: (id: string) => void }) {
  if (msg.role === "tool") {
    return <ToolBlock msg={msg} onToggle={() => onToolToggle(msg.id)} />;
  }

  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "bg-[var(--color-accent)] text-white rounded-br-sm"
          : "bg-[var(--color-surface)] text-[var(--color-text)] rounded-bl-sm"
      }`}>
        {msg.text}
        {msg.streaming && <span className="inline-block w-1.5 h-4 bg-current ml-1 animate-pulse rounded-sm" />}
      </div>
    </div>
  );
}

// ============================================================================
// Sidebar — conversations + skills
// ============================================================================

interface Conversation {
  id: string;
  title: string;
  created_at: number;
  message_count: number;
}

function Sidebar({
  conversations,
  activeConvId,
  onSelectConv,
  onNewConv,
  skills,
  selectedSkills,
  onToggleSkill,
  activeSkills,
}: {
  conversations: Conversation[];
  activeConvId: string | null;
  onSelectConv: (id: string) => void;
  onNewConv: () => void;
  skills: Skill[];
  selectedSkills: Set<string>;
  onToggleSkill: (name: string) => void;
  activeSkills: string[];
}) {
  return (
    <div className="w-56 flex-shrink-0 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-surface)]">
      {/* New conversation */}
      <button
        onClick={onNewConv}
        className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] border-b border-[var(--color-border)]"
      >
        <Plus className="w-4 h-4" /> New Conversation
      </button>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto py-1">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelectConv(c.id)}
            className={`w-full text-left px-4 py-2 text-sm truncate transition-colors ${
              c.id === activeConvId
                ? "bg-[var(--color-surface-2)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Skills panel */}
      {(skills.length > 0 || activeSkills.length > 0) && (
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Skills
          </div>
          {activeSkills.length > 0 && (
            <div className="mb-2">
              {activeSkills.map((name) => (
                <div key={name} className="text-xs text-[var(--color-accent)] py-0.5 truncate">🔧 {name}</div>
              ))}
            </div>
          )}
          {skills.filter((s) => !activeSkills.includes(s.name) && !["archived", "superseded"].includes(s.status)).map((s) => (
            <label key={s.id} className="flex items-center gap-2 py-0.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedSkills.has(s.name)}
                onChange={() => onToggleSkill(s.name)}
                className="accent-[var(--color-accent)]"
              />
              <span className="text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] truncate">{s.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Chat page
// ============================================================================

export function Chat({ config }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [activeSkillsThisSession, setActiveSkillsThisSession] = useState<string[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    loadSkills();
    loadMemories();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    const convs = await invoke<Conversation[]>("get_conversations", { limit: 50, offset: 0 });
    setConversations(convs);
  }

  async function loadSkills() {
    const all = await fetchSkills();
    setSkills(all);
  }

  async function loadMemories() {
    const mems = await invoke<Memory[]>("get_memories", {});
    setMemories(mems);
  }

  async function selectConversation(id: string) {
    setActiveConvId(id);
    const msgs = await invoke<any[]>("get_messages", { conversationId: id });
    const uiMsgs: UIMessage[] = msgs
      .filter((m) => m.role !== "tool_result")
      .map((m) => ({
        id: m.id,
        role: m.role === "tool_result" ? "tool" : m.role,
        text: m.content,
      }));
    setMessages(uiMsgs);
    setHistory(
      msgs.map((m) => ({
        role: m.role === "user" || m.role === "tool_result" ? "user" : "assistant",
        content: [{ type: "text" as const, text: m.content }],
      }))
    );
    setActiveSkillsThisSession([]);
  }

  async function newConversation(): Promise<Conversation> {
    const conv = await invoke<Conversation>("create_conversation", { title: "New Conversation" });
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
    setMessages([]);
    setHistory([]);
    setActiveSkillsThisSession([]);
    return conv;
  }

  function toggleSkill(name: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleSend() {
    if (!input.trim() || running) return;
    if (!config.api_key) {
      alert("Please configure your API key in Settings.");
      return;
    }

    let convId = activeConvId;
    if (!convId) {
      const conv = await newConversation();
      convId = conv.id;
    }

    const userText = input.trim();
    setInput("");

    const userMsg: UIMessage = { id: `u-${Date.now()}`, role: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);

    // Save user message
    if (convId) {
      await invoke("save_message", { conversationId: convId, role: "user", content: userText, toolCalls: null });
    }

    setRunning(true);
    abortRef.current = new AbortController();

    const provider = getProvider(config.provider);
    const allSkills = await (async () => { try { return await fetchSkills(); } catch { return []; } })();
    const skillCatalog = buildSkillCatalog(allSkills);
    const manualSkillNames = Array.from(selectedSkills);

    let assistantId = `a-${Date.now()}`;
    let assistantText = "";
    const newMessages = [...messages, userMsg];

    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", text: "", streaming: true }]);

    try {
      for await (const event of runAgent({
        provider,
        apiKey: config.api_key,
        history,
        userMessage: userText,
        memories,
        skillCatalog,
        manualSkills: manualSkillNames,
        workingDir: config.working_dir,
        signal: abortRef.current.signal,
      })) {
        if (event.type === "text") {
          assistantText += event.delta;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, text: assistantText } : m)
          );
        } else if (event.type === "tool_start") {
          const toolId = `t-${Date.now()}-${event.name}`;
          setMessages((prev) => [
            ...prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m),
            { id: toolId, role: "tool" as const, toolName: event.name, toolArgs: event.args, toolExpanded: true },
          ]);
          // Track read_skill calls
          if (event.name === "read_skill" && (event.args as any)?.name) {
            const name = (event.args as any).name;
            setActiveSkillsThisSession((prev) => prev.includes(name) ? prev : [...prev, name]);
          }
        } else if (event.type === "tool_result") {
          setMessages((prev) =>
            prev.map((m) => m.toolName === event.name && !m.toolResult ? { ...m, toolResult: event.result } : m)
          );
          // After a tool call, re-create the assistant streaming bubble
          assistantId = `a-${Date.now()}`;
          assistantText = "";
          setMessages((prev) => [...prev, { id: assistantId, role: "assistant", text: "", streaming: true }]);
        } else if (event.type === "stop" || event.type === "error") {
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m));
          if (event.type === "error") {
            setMessages((prev) => [...prev.filter((m) => m.id !== assistantId), {
              id: assistantId, role: "assistant", text: `⚠ Error: ${event.error}`, streaming: false,
            }]);
          }
        }
      }

      // Save final assistant message
      if (assistantText && convId) {
        await invoke("save_message", { conversationId: convId, role: "assistant", content: assistantText, toolCalls: null });
      }

      // Update conversation title from first user message
      if (conversations.find((c) => c.id === convId)?.title === "New Conversation" && userText) {
        const title = userText.slice(0, 50);
        await invoke("update_conversation_title", { id: convId, title });
        setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, title } : c));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
      setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })));
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function toggleToolExpand(id: string) {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, toolExpanded: !m.toolExpanded } : m));
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConv={selectConversation}
        onNewConv={newConversation}
        skills={skills}
        selectedSkills={selectedSkills}
        onToggleSkill={toggleSkill}
        activeSkills={activeSkillsThisSession}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-muted)]">
              <div className="text-5xl">✦</div>
              <div className="text-lg font-medium text-[var(--color-text)]">Grimoire</div>
              <div className="text-sm">The spellbook that learns. What do you need?</div>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onToolToggle={toggleToolExpand} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <div className="flex gap-2 items-end bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-2 focus-within:border-[var(--color-accent)]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={config.api_key ? "Type a message..." : "Configure your API key in Settings first"}
              disabled={!config.api_key}
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm focus:outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] min-h-[24px] max-h-40 overflow-y-auto leading-6 disabled:opacity-50"
              style={{ height: "auto" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 160) + "px";
              }}
            />
            {running ? (
              <button onClick={handleStop} className="p-1.5 rounded-xl bg-[var(--color-danger)]/20 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/30">
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !config.api_key}
                className="p-1.5 rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          {selectedSkills.size > 0 && (
            <div className="flex items-center gap-1 mt-1.5 px-1">
              <span className="text-xs text-[var(--color-text-muted)]">Skills loaded:</span>
              {Array.from(selectedSkills).map((name) => (
                <span key={name} className="text-xs text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded">{name}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
