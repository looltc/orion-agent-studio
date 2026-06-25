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
import CodeDiffView from "@/components/CodeDiffView";

interface ThinkEntry { iteration: number; thought: string; action: string; tool?: string; args?: Record<string,unknown>; answer?: string; }
interface Message { id: string; role: "user"|"agent"|"confirm"; text: string; taskId?: string; status?: string; timestamp: number; thoughts: ThinkEntry[]; confirmQid?: string; confirmResolved?: boolean; }

const TOOL_LABELS: Record<string,string>={add:"Calculate",mul:"Calculate",sub:"Calculate",div:"Calculate",browser_open:"Open Browser",browser_navigate:"Navigate",browser_click:"Click",browser_type:"Type",browser_scroll:"Scroll",browser_snapshot:"Snapshot",browser_get_page_text:"Extract Text",browser_extract_results:"Extract Results",browser_press_key:"Press Key",browser_evaluate_js:"Execute JS",browser_wait:"Wait",browser_go_back:"Go Back",browser_close:"Close Browser",knowledge_search:"Search Knowledge",human_confirm:"Confirm",code_read:"Read Code",code_search:"Search Code",code_search_symbols:"Find Symbol",code_apply_patch:"Edit Code",code_create_file:"Create File",code_lint:"Lint",code_run_tests:"Run Tests",code_project_structure:"Project Structure",code_get_dependencies:"Dependencies"};
function sl(e:ThinkEntry):string{return e.action==="finish"?"Complete":TOOL_LABELS[e.tool||""]||e.tool||e.action;}
function ds(e:ThinkEntry):string{if(e.thought)return e.thought;if(e.action==="finish")return e.answer||"(complete)";const a=e.args||{};return`调用 ${sl(e)} 工具${Object.keys(a).length>0?"，参数: "+JSON.stringify(a):""}`;}

// Extract code change info from a thought entry if it's a code tool call
function codeChangeOf(e: ThinkEntry): { tool: string; path: string; operations?: any[]; bytesWritten?: number } | null {
  if (!e.tool || !e.args) return null;
  if (e.tool === "code_apply_patch") {
    return { tool: e.tool, path: e.args.path as string, operations: e.args.operations as any[] };
  }
  if (e.tool === "code_create_file") {
    return { tool: e.tool, path: e.args.path as string, bytesWritten: (e.args.content as string)?.length };
  }
  return null;
}

function ThoughtCard({thoughts,expanded,onToggle}:{thoughts:ThinkEntry[];expanded:boolean;onToggle:()=>void}){if(!thoughts.length)return null;const l=thoughts[thoughts.length-1];return(<div className="mt-2 border border-surface-700 rounded-lg overflow-hidden"><button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-1.5 bg-surface-800/50 hover:bg-surface-800 text-xs"><Brain size={12} className="text-orion-400 shrink-0"/><span className="flex-1 text-left text-surface-400 truncate">{expanded?`Steps (${thoughts.length})`:`Step #${l.iteration} · ${sl(l)}`}</span><span className="text-surface-500 truncate max-w-[180px] hidden sm:inline">{l.thought?l.thought.slice(0,50)+(l.thought.length>50?"…":""):ds(l).slice(0,50)}</span>{expanded?<ChevronUp size={12}/>:<ChevronDown size={12}/>}</button>{expanded&&<div className="divide-y divide-surface-700 max-h-80 overflow-y-auto">{thoughts.map((e,i)=>{const f=e.action==="finish";return(<div key={i} className="px-3 py-2 text-xs"><div className="flex items-center gap-2 mb-1"><span className="text-surface-600 font-mono w-8 shrink-0">#{e.iteration}</span><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${f?"bg-purple-900/30 text-purple-400":"bg-surface-700 text-surface-300"}`}>{sl(e)}</span></div><p className="text-surface-400 leading-relaxed whitespace-pre-wrap ml-10">{ds(e)}</p></div>)})}</div>}</div>);}
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
              text: m.text + `\n→ ${answer === "approve" ? "已批准" : "已拒绝"}`,
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
              text: `错误: ${e?.message || e}`,
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
        <h1 className="text-sm font-medium text-surface-300">Orion 对话</h1>
        <span className="ml-auto text-xs text-surface-600">
          {rpc.connected ? "已连接" : "未连接"}
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
            <p className="text-surface-500 text-sm">让 Agent 帮你做点什么吧。</p>
            {!rpc.connected && (
              <p className="text-surface-600 text-xs mt-2">
                请连接 Orion Runtime Daemon 后开始。
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
                              ? "执行中…"
                              : msg.status === "done"
                              ? "已完成"
                              : msg.status === "failed"
                              ? "失败"
                              : "就绪"}
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
          ):(<>
            <div className={`rounded-xl px-4 py-2.5 text-sm ${msg.role==="user"?"bg-orion-600 text-white":"bg-surface-800 text-surface-200 border border-surface-700"}`}><p className="whitespace-pre-wrap break-words">{msg.text}</p>{msg.taskId&&<div className="flex items-center gap-1.5 mt-2 text-xs text-surface-500">{si(msg.status)}<span className="font-mono">{msg.taskId.slice(0,10)}</span><span>{msg.status==="running"?"Running…":msg.status==="done"?"Done":msg.status==="failed"?"Failed":"Ready"}</span></div>}</div>
            {msg.thoughts.length>0&&<ThoughtCard thoughts={msg.thoughts} expanded={expanded.has(msg.id)} onToggle={()=>toggle(msg.id)}/>}
            {/* Render code changes from the latest code tool call */}
            {msg.thoughts.length>0&&(() => {
              const codeThoughts = msg.thoughts.filter(e => codeChangeOf(e));
              if (codeThoughts.length === 0) return null;
              const last = codeThoughts[codeThoughts.length - 1];
              const cc = codeChangeOf(last);
              if (!cc) return null;
              return <CodeDiffView tool={cc.tool} path={cc.path} operations={cc.operations} bytesWritten={cc.bytesWritten} />;
            })()}
          </>)}
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
              rpc.connected ? "输入指令…" : "请先连接 Daemon…"
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
            拒绝
          </button>
          <button
            onClick={() => onRespond("approve")}
            className="px-3 py-1.5 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-xs font-medium"
          >
            批准
          </button>
        </div>
      ) : (
        <p className="text-xs text-surface-500 mt-2">已回复</p>
      )}
    </div>
  );
}
