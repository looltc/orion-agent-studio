import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Loader2, ChevronDown, Trash2, X,
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
import ConfirmDialog from "@/components/ConfirmDialog";
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
function loadChatHistory(agentId: string, sid: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`orion_chat_${agentId}_${sid}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveChatHistory(agentId: string, sid: string, msgs: ChatMessage[]) {
  try { localStorage.setItem(`orion_chat_${agentId}_${sid}`, JSON.stringify(msgs.slice(-200))); } catch {}
}

// ═══════════════════════════════════════════
// AgentWorkspacePage
// ═══════════════════════════════════════════
export default function AgentWorkspacePage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const agentRef = useRef<Agent | null>(null);
  // 保持 ref 和 state 同步
  useEffect(() => { agentRef.current = agent; }, [agent]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");

  // ── Session ──
  const [sessionId, setSessionId] = useState<string>(() => {
    return `session-${Date.now()}`;
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Task control ──
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [taskPaused, setTaskPaused] = useState(false);

  const openClearConfirm = () => {
    setShowClearConfirm(true);
  };

  const handleClearConfirm = () => {
    setShowClearConfirm(false);
    setSessionId(`session-${Date.now()}`);
  };

  const handleClearCancel = () => {
    setShowClearConfirm(false);
  };

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
    setMessages(loadChatHistory(agentId, sessionId));
  }, [agentId]);

  // Persist chat
  useEffect(() => {
    if (agentId) saveChatHistory(agentId, sessionId, messages);
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
      // Track running/paused task for control buttons
      const active = ts.find((t: any) => t.status === "running" || t.status === "ready");
      const paused = ts.find((t: any) => t.status === "paused");
      if (active && !paused) {
        setRunningTaskId(active.task_id);
        setTaskPaused(false);
      } else if (paused) {
        setRunningTaskId(paused.task_id);
        setTaskPaused(true);
      } else {
        setRunningTaskId(null);
        setTaskPaused(false);
      }
      const ids = new Set(messages.filter((m) => m.taskId).map((m) => m.taskId));
      for (const t of ts) {
        if (!ids.has(t.task_id)) continue;
        if (t.status === "done" || t.status === "failed" || t.status === "cancelled") {
          setMessages((prev) =>
            prev.map((m) =>
              m.taskId === t.task_id
                ? {
                    ...m,
                    status: t.status,
                    text:
                      t.status === "done"
                        ? t.result_summary || "(no output)"
                        : t.status === "cancelled"
                        ? "任务已取消。"
                        : `Failed: ${t.error || "unknown"}`,
                  }
                : m
            )
          );
          // Clear running task on completion
          if (t.status !== "running" && t.status !== "ready" && t.status !== "paused") {
            setRunningTaskId(null);
            setTaskPaused(false);
          }
        }
      }
    } catch {}
  }, [messages]);

  useEffect(() => {
    const iv = setInterval(poll, 1500);
    return () => clearInterval(iv);
  }, [poll]);

  // ── Send ──
  // ── Skill chips ──
  const [activeSkills, setActiveSkills] = useState<string[]>([]);

  const toggleSkillChip = (skill: string) => {
    setActiveSkills(prev => prev.includes(skill)
      ? prev.filter(s => s !== skill)
      : [...prev, skill]);
  };

  const handleSend = async () => {
    let text = input.trim();
    // 拼装 active skills 到消息前面
    if (activeSkills.length > 0) {
      text = `【使用技能：${activeSkills.join("、")}】\n${text}`;
    }
    if (!text || sending || !rpc.connected) return;
    setInput("");
    setActiveSkills([]);
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
      // 每次发送前从 localStorage 重新加载，确保拿到最新配置
      const latest = agentId ? await agentStore.getById(agentId) : null;
      const cur = latest || agentRef.current;
      if (latest) { agentRef.current = latest; setAgent(latest); }

      // 组装 personality 到 system_prompt
      let fullPrompt = cur?.system_prompt || "";
      if (cur?.personality?.traits && cur.personality.traits.length > 0) {
        const traitText = cur.personality.traits.join("、");
        fullPrompt = `${fullPrompt}\n性格特质：${traitText}。`;
      }

      console.log("[AgentWorkspace] sending task", { agentId, system_prompt: fullPrompt.slice(0, 50), skills: cur?.skills });
      const task = await rpc.createTask(text, agentId, sessionId, {
        system_prompt: fullPrompt || undefined,
        skills: cur?.skills,
        active_skills: activeSkills.length > 0 ? activeSkills : undefined,
        llm_provider_id: cur?.llm_provider_id,
      });
      setActiveSkills([]);
      console.log("[AgentWorkspace] task created", task.task_id);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${task.task_id}`,
          role: "agent",
          text: "思考中…",
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

  const handlePause = async () => {
    if (!runningTaskId) return;
    try {
      await rpc.pauseTask(runningTaskId);
      setTaskPaused(true);
    } catch (e: any) {
      console.error("Pause failed:", e);
    }
  };

  const handleResume = async () => {
    if (!runningTaskId) return;
    try {
      await rpc.resumeTask(runningTaskId);
      setTaskPaused(false);
    } catch (e: any) {
      console.error("Resume failed:", e);
    }
  };

  const handleCancel = async () => {
    if (!runningTaskId) return;
    try {
      await rpc.cancelTask(runningTaskId);
      setRunningTaskId(null);
      setTaskPaused(false);
    } catch (e: any) {
      console.error("Cancel failed:", e);
    }
  };

  // ── Handlers ──
  const handleHumanRespond = async (msgId: string, taskId: string, qid: string, answer: string) => {
    try { await rpc.answerHumanQuestion(taskId, qid, answer); } catch (e) { console.error(e); }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, confirmResolved: true, text: m.text + `\n→ ${answer === "approve" ? "已批准" : "已拒绝"}` }
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
        <p className="text-surface-500">未找到 Agent。</p>
      </div>
    );
  }

  const inputDisabled = sending;

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
            {rpc.connected ? "已连接" : "未连接"}
          </span>
        </div>

        {/* ── Tab content ── */}
        {activeTab === "chat" && (
          <>
            {/* Messages */}
            <div ref={chatRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-surface-500 text-sm">开始与 {agent.name} 对话吧。</p>
                  {!rpc.connected && (
                    <p className="text-surface-600 text-xs mt-2">请连接 Orion Runtime Daemon 后开始。</p>
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
                                {msg.status === "running" ? "执行中…" : msg.status === "done" ? "已完成" : msg.status === "failed" ? "失败" : "就绪"}
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
              {/* Skill chips */}
              {agent?.skills && agent.skills.length > 0 && (
                <div className="max-w-3xl mx-auto flex flex-wrap gap-1.5 mb-2">
                  {agent.skills.map(skill => {
                    const active = activeSkills.includes(skill);
                    return (
                      <button key={skill}
                        onClick={() => toggleSkillChip(skill)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-medium transition-colors ${
                          active
                            ? "bg-orion-600 text-white"
                            : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
                        }`}>
                        @{skill}
                        {active && <X size={10} />}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Task control buttons (pause/resume/cancel) */}
              {runningTaskId && (
                <div className="max-w-3xl mx-auto flex items-center gap-2 mb-2">
                  {taskPaused ? (
                    <>
                      <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">已暂停</span>
                      <button onClick={handleResume}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-xs font-medium transition-colors">
                        <Play size={12} /> 继续
                      </button>
                    </>
                  ) : (
                    <button onClick={handlePause}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-medium transition-colors">
                      <Loader2 size={12} /> 暂停
                    </button>
                  )}
                  <button onClick={handleCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium transition-colors">
                    <X size={12} /> 取消
                  </button>
                </div>
              )}
              <div className="max-w-3xl mx-auto flex items-center gap-2 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 focus-within:border-orion-500/50">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                  placeholder={rpc.connected ? `给 ${agent.name} 发送消息…` : "请先连接 Daemon…"}
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

        {activeTab === "tasks" && <TasksPanel agent={agent} onSelectSession={(sid: string) => {
          const msgs = loadChatHistory(agentId!, sid);
          setSessionId(sid);
          setMessages(msgs);
          setActiveTab("chat");
        }} />}
        {activeTab === "memory" && <InfoPanel icon={Brain} title="记忆" agent={agent} description="为该 Agent 提供长期记忆、情景记忆、语义记忆和工作记忆。" />}
        {activeTab === "browser" && <InfoPanel icon={Globe} title="浏览器" agent={agent} description="浏览器自动化 — 导航、点击、从网页提取内容。基于 Playwright。" />}
        {activeTab === "desktop" && <InfoPanel icon={Monitor} title="桌面" agent={agent} description="桌面自动化 — 控制应用程序并与操作系统交互。" />}
        {activeTab === "knowledge" && <InfoPanel icon={Database} title="知识库" agent={agent} description="文档加载与检索。在已索引的知识库中进行搜索。" />}
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
            className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium">拒绝</button>
          <button onClick={() => onRespond("approve")}
            className="px-3 py-1.5 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-xs font-medium">批准</button>
        </div>
      ) : (
        <p className="text-xs text-surface-500 mt-2">已回复</p>
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

function TasksPanel({ agent, onSelectSession }: { agent: Agent; onSelectSession: (sessionId: string) => void }) {
  const [sessions, setSessions] = useState<{ id: string; title: string; date: string; count: number }[]>([]);

  useEffect(() => {
    loadSessions();
  }, [agent.id]);

  const loadSessions = () => {
    const list: { id: string; title: string; date: string; count: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`orion_chat_${agent.id}_`)) {
        try {
          const msgs = JSON.parse(localStorage.getItem(key) || "[]");
          const first = msgs.find((m: any) => m.role === "user");
          if (first) {
            list.push({
              id: key,
              title: (first.text || "").slice(0, 60),
              date: new Date(first.timestamp).toLocaleString(),
              count: msgs.length,
            });
          }
        } catch {}
      }
    }
    list.sort((a, b) => b.date.localeCompare(a.date));
    setSessions(list);
  };

  const handleDelete = (key: string, sid: string) => {
    if (!confirm(`确定删除该会话吗？`)) return;
    localStorage.removeItem(key);
    // 同步删除 daemon 磁盘文件
    try { rpc.call("session.delete", { session_id: sid }); } catch {}
    loadSessions();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orion-50 dark:bg-orion-900/20 flex items-center justify-center">
          <ListTodo size={20} className="text-orion-600 dark:text-orion-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">会话</h2>
          <p className="text-xs text-surface-500">{agent.name} · 共 {sessions.length} 个会话</p>
        </div>
        <button onClick={() => {
          const sid = `session-${Date.now()}`;
          onSelectSession(sid);
        }}
          className="ml-auto px-3 py-1.5 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-xs font-medium transition-colors">
          + 新建
        </button>
      </div>
      {sessions.length === 0 ? (
        <p className="text-sm text-surface-500">还没有会话。和 {agent.name} 对话即可创建一个。</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const sid = s.id.replace(`orion_chat_${agent.id}_`, "");
            return (
            <div key={s.id} className="group flex items-center gap-3 p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-orion-400/40 cursor-pointer transition-colors">
              <div onClick={() => onSelectSession(sid)} className="flex-1 min-w-0">
                <p className="text-sm text-surface-900 dark:text-white truncate">{s.title}</p>
                <p className="text-xs text-surface-500 mt-1">{s.date} · {s.count} 条消息</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id, sid); }}
                className="p-1 rounded text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="删除会话">
                <Trash2 size={14} />
              </button>
            </div>
            );
          })}
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
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">分析</h2>
          <p className="text-xs text-surface-500">{agent.name}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="任务" value={String(agent.metrics.tasks)} />
        <MetricCard label="成功率" value={`${agent.metrics.successRate}%`} />
        <MetricCard label="记忆" value={String(agent.metrics.memoryCount)} />
        <MetricCard label="费用" value={agent.metrics.cost || "—"} />
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

const FALLBACK_SKILLS = ["generate-daily-report", "summarize-meeting"];

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
  const [availableSkills, setAvailableSkills] = useState<{name: string; description: string}[]>(
    FALLBACK_SKILLS.map((s) => ({ name: s, description: "" }))
  );

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
    // 从 daemon 加载可用技能列表
    rpc.listSkills().then((s) => {
      if (s.length > 0) setAvailableSkills(s);
    }).catch(() => {});
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
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Agent 设置</h2>
          <p className="text-xs text-surface-500">{agent.name}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div><label className="text-xs text-surface-500 mb-1 block">名称</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50" />
        </div>
        <div><label className="text-xs text-surface-500 mb-1 block">角色</label>
          <input type="text" value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50" />
        </div>
        <div><label className="text-xs text-surface-500 mb-1 block">性格特质</label>
          <input type="text" value={traits} onChange={(e) => setTraits(e.target.value)}
            className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50" placeholder="精确、有条理" />
        </div>
        <div><label className="text-xs text-surface-500 mb-2 block">能力</label>
          <div className="flex flex-wrap gap-2">
            {CAPABILITY_OPTIONS.map((c) => (
              <button key={c.key} onClick={() => toggleCap(c.key)}
                className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${caps.includes(c.key) ? "bg-orion-600 text-white" : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"}`}>{c.label}</button>
            ))}
          </div>
        </div>
        {/* System Prompt */}
        <div><label className="text-xs text-surface-500 mb-1 block">系统提示词</label>
          <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50 resize-vertical"
            placeholder="你是一个资深软件架构师。擅长系统设计与代码审查。用简洁精确的中文回复。" />
        </div>
        {/* Skills */}
        <div><label className="text-xs text-surface-500 mb-2 block">技能</label>
          <div className="flex flex-wrap gap-2">
            {availableSkills.map((skill) => (
              <button key={skill.name} onClick={() => toggleSkill(skill.name)}
                title={skill.description || skill.name}
                className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors flex items-center gap-1 max-w-[200px] ${skills.includes(skill.name) ? "bg-orion-600 text-white" : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"}`}>
                <span className="font-medium truncate">{skill.name}</span>
                {skill.description && (
                  <span className="text-[10px] opacity-60 truncate hidden sm:inline">{skill.description}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* LLM Provider */}
        <div><label className="text-xs text-surface-500 mb-1 block">LLM 提供者</label>
          {providersLoading ? (
            <p className="text-xs text-surface-400">加载中…</p>
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
          className="w-full py-2 rounded-lg bg-orion-600 hover:bg-orion-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">{saved ? "已保存 ✓" : "保存修改"}</button>
      </div>
    </div>
  );
}
