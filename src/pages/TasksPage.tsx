import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import type { ProtocolTask, ApprovalRequest } from "@/types/protocol";
import rpc from "@/client/rpc";
import ApprovalDialog from "@/components/ApprovalDialog";
import ThoughtCard, { type ThinkEntry } from "@/components/ThoughtCard";

interface Message {
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

export default function TasksPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [atBottom, setAtBottom] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const seenQids = useRef(new Set<string>());

  // ── Auto-scroll ──
  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

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

  // ── Poll for task status ──
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
    } catch {
      // Daemon not connected — silently retry
    }
  }, [messages]);

  useEffect(() => {
    const iv = setInterval(poll, 1500);
    return () => clearInterval(iv);
  }, [poll]);

  // ── Actions ──
  const handleHumanRespond = async (
    msgId: string,
    taskId: string,
    qid: string,
    answer: string
  ) => {
    try {
      await rpc.answerHumanQuestion(taskId, qid, answer);
    } catch (e) {
      console.error(e);
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              confirmResolved: true,
              text: m.text + `\n→ ${answer === "approve" ? "Approved" : "Rejected"}`,
            }
          : m
      )
    );
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !rpc.connected) return;
    setInput("");
    setSending(true);
    const userMsg: Message = {
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

  const handleApprovalRespond = async (
    aid: string,
    action: "approve" | "reject",
    reason: string
  ) => {
    try {
      await rpc.respondApproval(aid, action, reason);
      setApproval(null);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleThought = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  const inputDisabled = sending || !rpc.connected;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="h-12 flex items-center px-4 border-b border-surface-700 shrink-0">
        <h1 className="text-sm font-medium text-surface-300">Orion Chat</h1>
        <span className="ml-auto text-xs text-surface-600">
          {rpc.connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative"
      >
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-surface-500 text-sm">Ask the agent to do something.</p>
            {!rpc.connected && (
              <p className="text-surface-600 text-xs mt-2">
                Connect to Orion Runtime Daemon to start.
              </p>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === "user"
                  ? "bg-orion-600 text-white"
                  : msg.role === "confirm"
                  ? "bg-yellow-700 text-yellow-300"
                  : "bg-surface-700 text-surface-300"
              }`}
            >
              {msg.role === "user" ? "U" : msg.role === "confirm" ? <HelpCircle size={14} /> : "O"}
            </div>

            <div className="max-w-[85%] min-w-0">
              {msg.role === "confirm" ? (
                <ConfirmCard
                  msg={msg}
                  onRespond={(answer) =>
                    handleHumanRespond(msg.id, msg.taskId || "", msg.confirmQid || "", answer)
                  }
                />
              ) : (
                <>
                  <div
                    className={`rounded-xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-orion-600 text-white"
                        : "bg-surface-800 text-surface-200 border border-surface-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    {msg.taskId && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-surface-500">
                        <StatusIcon status={msg.status} />
                        <span className="font-mono">{msg.taskId.slice(0, 10)}</span>
                        <span>
                          {msg.status === "running"
                            ? "Running…"
                            : msg.status === "done"
                            ? "Done"
                            : msg.status === "failed"
                            ? "Failed"
                            : "Ready"}
                        </span>
                      </div>
                    )}
                  </div>
                  {msg.thoughts.length > 0 && (
                    <ThoughtCard
                      thoughts={msg.thoughts}
                      expanded={expanded.has(msg.id)}
                      onToggle={() => toggleThought(msg.id)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />

        {/* Scroll-to-bottom FAB */}
        {!atBottom && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-orion-600 hover:bg-orion-700 text-white shadow-lg flex items-center justify-center transition-all"
          >
            <ChevronDown size={18} />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-surface-700 shrink-0">
        <div className="flex items-center gap-2 bg-surface-900 border border-surface-700 rounded-xl px-3 py-2 focus-within:border-orion-600/50">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              rpc.connected ? "Ask the agent…" : "Connect to daemon first…"
            }
            disabled={inputDisabled}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-surface-600 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || inputDisabled}
            className="p-1.5 rounded-lg bg-orion-600 hover:bg-orion-700 disabled:opacity-30 transition-colors"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>

      <ApprovalDialog
        request={approval}
        onRespond={handleApprovalRespond}
        onDismiss={() => setApproval(null)}
      />
    </div>
  );
}

// ── ConfirmCard (inline sub-component) ──
function ConfirmCard({
  msg,
  onRespond,
}: {
  msg: Message;
  onRespond: (answer: string) => void;
}) {
  return (
    <div className="border border-yellow-800/50 bg-yellow-900/10 rounded-xl px-4 py-3">
      <p className="text-sm text-yellow-200 whitespace-pre-wrap">{msg.text}</p>
      {!msg.confirmResolved ? (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onRespond("reject")}
            className="px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 text-xs font-medium"
          >
            Reject
          </button>
          <button
            onClick={() => onRespond("approve")}
            className="px-3 py-1.5 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-xs font-medium"
          >
            Approve
          </button>
        </div>
      ) : (
        <p className="text-xs text-surface-500 mt-2">Responded</p>
      )}
    </div>
  );
}
