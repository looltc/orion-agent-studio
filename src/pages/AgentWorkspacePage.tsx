import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Loader2, ChevronDown,
  Brain, CheckCircle2, XCircle, Clock, HelpCircle,
  ListTodo, Database, BarChart3, Settings, Monitor, Globe,
} from "lucide-react";
import type { LLMProvider } from "@/types/provider";
import type { Agent, WorkspaceTab } from "@/types/agent";
import type { ProtocolTask, ApprovalRequest } from "@/types/protocol";
import { agentStore, CAPABILITY_OPTIONS } from "@/store/agentStore";
import AgentStatusBadge from "@/components/agent/AgentStatusBadge";
import AgentCapabilityTags from "@/components/agent/AgentCapabilityTags";
import AgentMetricsDisplay from "@/components/agent/AgentMetrics";
import WorkspaceNav from "@/components/workspace/WorkspaceNav";
import ApprovalDialog from "@/components/ApprovalDialog";
import ThoughtCard, { type ThinkEntry } from "@/components/ThoughtCard";
import rpc from "@/client/rpc";

// ── Chat message model (same as TasksPage) ──
interface ChatMessage {
  id: string;
  role: "user" | "agent" | "confirm";
  text: string;
  taskId?: string;
  status?: string;
  timestamp: number;
  thoughts: ThinkEntry[];
  confirmQid?: string;
  confirmResolved?: boolean;
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "running" || status === "ready")
    return <Loader2 size={14} className="animate-spin text-blue-400" />;
  if (status === "done") return <CheckCircle2 size={14} className="text-green-400" />;
  if (status === "failed") return <XCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-surface-500" />;
}

// ── localStorage helpers ──
function loadChatHistory(agentId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`orion_chat_${agentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveChatHistory(agentId: string, msgs: ChatMessage[]) {
  try { localStorage.setItem(`orion_chat_${agentId}`, JSON.stringify(msgs.slice(-200))); } catch {}
}

// ═══════════════════════════════════════════
// AgentWorkspacePage
// ═══════════════════════════════════════════
export default function AgentWorkspacePage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");

  // ── Chat state ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [atBottom, setAtBottom] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const seenQids = useRef(new Set<string>());

  // ── Load agent ──
  useEffect(() => {
    if (!agentId) return;
    agentStore.getById(agentId).then((a) => { if (a) setAgent(a); });
    setMessages(loadChatHistory(agentId));
  }, [agentId]);

  // Persist chat
  useEffect(() => {
    if (agentId) saveChatHistory(agentId, messages);
  }, [messages, agentId]);

  // ── Auto-scroll ──
  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.role === "user" || (last.role === "agent" && last.status !== "running")) {
      scrollToBottom();
    }
  }, [messages]);

  // ── Event listeners ──
  useEffect(() => {
    const onThink = (d: any) => {
      const entry: ThinkEntry = {
        iteration: d.payload?.iteration || 0,
        thought: d.payload?.thought || "",
        action: d.payload?.action || "",
        tool: d.payload?.tool,
        args: d.payload?.arguments || d.payload?.args,
        answer: d.payload?.answer,
      };
      setMessages((prev) => {
        const idx = [...prev].reverse().findIndex(
          (m) => m.role === "agent" && m.taskId === d.task_id
        );
        if (idx === -1) return prev;
        const ri = prev.length - 1 - idx;
        const next = [...prev];
        next[ri] = { ...next[ri], thoughts: [...next[ri].thoughts, entry] };
        return next;
      });
    };

    const onHumanQ = (d: any) => {
      const qid = d.payload?.question_id || "";
      if (seenQids.current.has(qid)) return;
      seenQids.current.add(qid);
      setMessages((prev) => [
        ...prev,
        {
          id: `c-${qid}`,
          role: "confirm",
          text: d.payload?.question || "",
          taskId: d.payload?.task_id || d.task_id || "",
          timestamp: Date.now(),
          thoughts: [],
          confirmQid: qid,
          confirmResolved: false,
        },
      ]);
    };

    const onApproval = (d: unknown) => setApproval(d as ApprovalRequest);

    rpc.on("react.think", onThink);
    rpc.on("human.question", onHumanQ);
    rpc.on("approval.requested", onApproval);

    return () => {
      rpc.off("react.think", onThink);
      rpc.off("human.question", onHumanQ);
      rpc.off("approval.requested", onApproval);
    };
  }, []);

  // ── Poll task status ──
  const poll = useCallback(async () => {
    try {
      const ts = await rpc.listTasks();
      const ids = new Set(messages.filter((m) => m.taskId).map((m) => m.taskId));
      for (const t of ts) {
        if (!ids.has(t.task_id)) continue;
        if (t.status === "done" || t.status === "failed") {
          setMessages((prev) =>
            prev.map((m) =>
              m.taskId === t.task_id
                ? {
                    ...m,
                    status: t.status,
                    text:
                      t.status === "done"
                        ? t.result_summary || "(no output)"
                        : `Failed: ${t.error || "unknown"}`,
                  }
                : m
            )
          );
        }
      }
    } catch {}
  }, [messages]);

  useEffect(() => {
    const iv = setInterval(poll, 1500);
    return () => clearInterval(iv);
  }, [poll]);

  // ── Send ──
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !rpc.connected) return;
    setInput("");
    setSending(true);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
      thoughts: [],
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const task = await rpc.createTask(text);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${task.task_id}`,
          role: "agent",
          text: "Thinking…",
          taskId: task.task_id,
          status: "running",
          timestamp: Date.now(),
          thoughts: [],
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "agent",
          text: `Error: ${e?.message || e}`,
          status: "failed",
          timestamp: Date.now(),
          thoughts: [],
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // ── Handlers ──
  const handleHumanRespond = async (msgId: string, taskId: string, qid: string, answer: string) => {
    try { await rpc.answerHumanQuestion(taskId, qid, answer); } catch (e) { console.error(e); }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, confirmResolved: true, text: m.text + `\n→ ${answer === "approve" ? "Approved" : "Rejected"}` }
          : m
      )
    );
  };

  const handleApprovalRespond = async (aid: string, action: "approve" | "reject", reason: string) => {
    try { await rpc.respondApproval(aid, action, reason); setApproval(null); } catch (e) { console.error(e); }
  };

  const toggleThought = (id: string) =>
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const handleScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  if (!agent) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-surface-500">Agent not found.</p>
      </div>
    );
  }

  const inputDisabled = sending || !rpc.connected;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-12 flex items-center gap-3 px-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <button onClick={() => navigate("/")} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-medium text-sm text-surface-900 dark:text-white truncate">{agent.name}</span>
            <AgentStatusBadge status={agent.status.state} compact />
          </div>
          <span className="text-xs text-surface-400 dark:text-surface-600 truncate max-w-[160px]">
            {rpc.connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        {/* ── Tab content ── */}
        {activeTab === "chat" && (
          <>
            {/* Messages */}
            <div ref={chatRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-surface-500 text-sm">Start a conversation with {agent.name}.</p>
                  {!rpc.connected && (
                    <p className="text-surface-600 text-xs mt-2">Connect to Orion Runtime Daemon to start.</p>
                  )}
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.role === "user" ? "bg-orion-600 text-white" :
                    msg.role === "confirm" ? "bg-amber-100 dark:bg-yellow-700 text-amber-700 dark:text-yellow-300" :
                    "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300"
                  }`}>
                    {msg.role === "user" ? "U" : msg.role === "confirm" ? <HelpCircle size={14} /> : "OA"}
                  </div>
                  <div className="max-w-[85%] min-w-0">
                    {msg.role === "confirm" ? (
                      <ConfirmCard msg={msg} onRespond={(answer) => handleHumanRespond(msg.id, msg.taskId || "", msg.confirmQid || "", answer)} />
                    ) : (
                      <>
                        <div className={`rounded-xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-orion-600 text-white"
                            : "bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700"
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          {msg.taskId && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-surface-500">
                              <StatusIcon status={msg.status} />
                              <span className="font-mono">{msg.taskId.slice(0, 10)}</span>
                              <span>
                                {msg.status === "running" ? "Running…" : msg.status === "done" ? "Done" : msg.status === "failed" ? "Failed" : "Ready"}
                              </span>
                            </div>
                          )}
                        </div>
                        {msg.thoughts.length > 0 && (
                          <ThoughtCard thoughts={msg.thoughts} expanded={expanded.has(msg.id)} onToggle={() => toggleThought(msg.id)} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
              {!atBottom && (
                <button onClick={scrollToBottom} className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-orion-600 text-white shadow-lg flex items-center justify-center">
                  <ChevronDown size={18} />
                </button>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-surface-200 dark:border-surface-700 shrink-0">
              <div className="max-w-3xl mx-auto flex items-center gap-2 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 focus-within:border-orion-500/50">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                  placeholder={rpc.connected ? `Message ${agent.name}…` : "Connect to daemon first…"}
                  disabled={inputDisabled}
                  className="flex-1 bg-transparent text-sm text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-600 outline-none" />
                <button onClick={handleSend} disabled={!input.trim() || inputDisabled}
                  className="p-1.5 rounded-lg bg-orion-600 hover:bg-orion-700 disabled:opacity-30 transition-colors">
                  {sending ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
                </button>
              </div>
            </div>

            <ApprovalDialog request={approval} onRespond={handleApprovalRespond} onDismiss={() => setApproval(null)} />
          </>
        )}

        {activeTab === "tasks" && <TasksPanel agent={agent} />}
        {activeTab === "memory" && <InfoPanel icon={Brain} title="Memory" agent={agent} description="Long-term, episodic, semantic, and working memory for this agent." />}
        {activeTab === "browser" && <InfoPanel icon={Globe} title="Browser" agent={agent} description="Browser automation — navigate, click, extract content from web pages. Powered by Playwright." />}
        {activeTab === "desktop" && <InfoPanel icon={Monitor} title="Desktop" agent={agent} description="Desktop automation — control applications and interact with the OS." />}
        {activeTab === "knowledge" && <InfoPanel icon={Database} title="Knowledge" agent={agent} description="Document loading and retrieval. Search through indexed knowledge bases." />}
        {activeTab === "analytics" && <AnalyticsPanel agent={agent} />}
        {activeTab === "settings" && <AgentSettingsPanel agent={agent} onUpdated={(a) => setAgent(a)} />}
      </div>

      <WorkspaceNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

// ── ConfirmCard ──
function ConfirmCard({ msg, onRespond }: { msg: ChatMessage; onRespond: (answer: string) => void }) {
  return (
    <div className="border border-amber-200 dark:border-yellow-800/50 bg-amber-50 dark:bg-yellow-900/10 rounded-xl px-4 py-3">
      <p className="text-sm text-amber-800 dark:text-yellow-200 whitespace-pre-wrap">{msg.text}</p>
      {!msg.confirmResolved ? (
        <div className="flex gap-2 mt-3">
          <button onClick={() => onRespond("reject")}
            className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium">Reject</button>
          <button onClick={() => onRespond("approve")}
            className="px-3 py-1.5 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-xs font-medium">Approve</button>
        </div>
      ) : (
        <p className="text-xs text-surface-500 mt-2">Responded</p>
      )}
    </div>
  );
}

// ── Sub-panels ──

function InfoPanel({ icon: Icon, title, agent, description }: { icon: typeof Brain; title: string; agent: Agent; description: string }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orion-50 dark:bg-orion-900/20 flex items-center justify-center">
          <Icon size={20} className="text-orion-600 dark:text-orion-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{title}</h2>
          <p className="text-xs text-surface-500">{agent.name}</p>
        </div>
      </div>
      <p className="text-sm text-surface-600 dark:text-surface-400">{description}</p>
    </div>
  );
}

function TasksPanel({ agent }: { agent: Agent }) {
  const [tasks, setTasks] = useState<ProtocolTask[]>([]);

  useEffect(() => {
    rpc.listTasks().then(setTasks).catch(() => {});
    const iv = setInterval(() => { rpc.listTasks().then(setTasks).catch(() => {}); }, 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orion-50 dark:bg-orion-900/20 flex items-center justify-center">
          <ListTodo size={20} className="text-orion-600 dark:text-orion-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Tasks</h2>
          <p className="text-xs text-surface-500">{agent.name} · {tasks.length} tasks</p>
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-surface-500">No tasks yet. Send a message in Chat to create one.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.task_id} className="p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
              <p className="text-sm text-surface-900 dark:text-white truncate">{t.goal}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-surface-500">{t.task_id.slice(0, 12)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-pill ${
                  t.status === "done" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                  t.status === "running" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                  t.status === "failed" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                  "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
                }`}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsPanel({ agent }: { agent: Agent }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orion-50 dark:bg-orion-900/20 flex items-center justify-center">
          <BarChart3 size={20} className="text-orion-600 dark:text-orion-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Analytics</h2>
          <p className="text-xs text-surface-500">{agent.name}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Tasks" value={String(agent.metrics.tasks)} />
        <MetricCard label="Success Rate" value={`${agent.metrics.successRate}%`} />
        <MetricCard label="Memory" value={String(agent.metrics.memoryCount)} />
        <MetricCard label="Cost" value={agent.metrics.cost || "—"} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
      <p className="text-2xl font-bold text-surface-900 dark:text-white tabular-nums">{value}</p>
      <p className="text-xs text-surface-500 mt-1">{label}</p>
    </div>
  );
}

const AVAILABLE_SKILLS = ["generate-daily-report", "summarize-meeting"];

function AgentSettingsPanel({ agent, onUpdated }: { agent: Agent; onUpdated: (a: Agent) => void }) {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [traits, setTraits] = useState(agent.personality.traits.join(", "));
  const [caps, setCaps] = useState(agent.capabilities.filter((c) => c.enabled).map((c) => c.key));
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt || "");
  const [skills, setSkills] = useState<string[]>(agent.skills || []);
  const [llmProviderId, setLlmProviderId] = useState(agent.llm_provider_id || "");
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        if (rpc.connected) {
          setProviders(await rpc.listProviders());
        } else {
          setProviders(await agentStore.loadProviders());
        }
      } catch {
        setProviders(await agentStore.loadProviders());
      } finally {
        setProvidersLoading(false);
      }
    };
    loadProviders();
  }, []);

  const toggleCap = (key: string) => setCaps((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  const toggleSkill = (skill: string) => setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);

  const handleSave = async () => {
    const updated = await agentStore.update(agent.id, {
      name: name.trim(), role: role.trim(),
      personality: { name: name.trim(), traits: traits.split(",").map((t) => t.trim()).filter(Boolean) },
      capabilities: CAPABILITY_OPTIONS.map((c) => ({ ...c, enabled: caps.includes(c.key) })),
      system_prompt: systemPrompt.trim() || undefined,
      skills: skills.length > 0 ? skills : undefined,
      llm_provider_id: llmProviderId || undefined,
    });
    if (updated) { onUpdated(updated); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orion-50 dark:bg-orion-900/20 flex items-center justify-center">
          <Settings size={20} className="text-orion-600 dark:text-orion-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Agent Settings</h2>
          <p className="text-xs text-surface-500">{agent.name}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div><label className="text-xs text-surface-500 mb-1 block">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50" />
        </div>
        <div><label className="text-xs text-surface-500 mb-1 block">Role</label>
          <input type="text" value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50" />
        </div>
        <div><label className="text-xs text-surface-500 mb-1 block">Traits</label>
          <input type="text" value={traits} onChange={(e) => setTraits(e.target.value)}
            className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50" placeholder="precise, structured" />
        </div>
        <div><label className="text-xs text-surface-500 mb-2 block">Capabilities</label>
          <div className="flex flex-wrap gap-2">
            {CAPABILITY_OPTIONS.map((c) => (
              <button key={c.key} onClick={() => toggleCap(c.key)}
                className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${caps.includes(c.key) ? "bg-orion-600 text-white" : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"}`}>{c.label}</button>
            ))}
          </div>
        </div>
        {/* System Prompt */}
        <div><label className="text-xs text-surface-500 mb-1 block">System Prompt</label>
          <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50 resize-vertical"
            placeholder="你是一个资深软件架构师。擅长系统设计与代码审查。用简洁精确的中文回复。" />
        </div>
        {/* Skills */}
        <div><label className="text-xs text-surface-500 mb-2 block">Skills</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SKILLS.map((skill) => (
              <button key={skill} onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${skills.includes(skill) ? "bg-orion-600 text-white" : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"}`}>{skill}</button>
            ))}
          </div>
        </div>
        {/* LLM Provider */}
        <div><label className="text-xs text-surface-500 mb-1 block">LLM Provider</label>
          {providersLoading ? (
            <p className="text-xs text-surface-400">Loading providers…</p>
          ) : (
            <select value={llmProviderId} onChange={(e) => setLlmProviderId(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50">
              <option value="">Default (none)</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.model})</option>
              ))}
            </select>
          )}
        </div>
        <button onClick={handleSave} disabled={!name.trim()}
          className="w-full py-2 rounded-lg bg-orion-600 hover:bg-orion-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">{saved ? "Saved ✓" : "Save Changes"}</button>
      </div>
    </div>
  );
}
