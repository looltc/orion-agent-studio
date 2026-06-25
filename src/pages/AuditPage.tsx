import { useState, useCallback } from "react";
import { Search, ShieldCheck, Loader2 } from "lucide-react";
import type { AuditEvent } from "@/types/protocol";
import rpc from "@/client/rpc";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [taskFilter, setTaskFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!taskFilter.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const logs = await rpc.getLogs(taskFilter.trim(), 200);
      setEvents(logs);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [taskFilter]);

  return (
    <div className="h-full flex flex-col">
      {/* Header（固定不滚动） */}
      <div className="shrink-0 px-6 pt-6 pb-4 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">审计日志</h1>
            <p className="text-sm text-surface-500 mt-0.5">
              查看任务的详细审计记录
            </p>
          </div>
        </div>
      </div>

      {/* 内容区（独立滚动） */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 max-w-5xl w-full mx-auto">
      {/* Task filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-600"
          />
          <input
            type="text"
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadLogs()}
            placeholder="输入 task_id 加载审计日志..."
            className="w-full bg-surface-900 border border-surface-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-surface-600 outline-none focus:border-orion-600/50"
          />
        </div>
        <button
          onClick={loadLogs}
          disabled={loading || !taskFilter.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 disabled:opacity-40 text-sm font-medium transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> 加载中…
            </>
          ) : (
            "加载"
          )}
        </button>
      </div>

      {/* Results */}
      {!searched ? (
        <div className="text-center py-16">
          <ShieldCheck size={40} className="mx-auto text-surface-700 mb-3" />
          <p className="text-surface-500 text-sm">
            输入任务 ID 以查看其审计记录。
          </p>
          <p className="text-surface-600 text-xs mt-1">
            所有工具调用、审批和任务生命周期事件都会被记录。
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto text-surface-700 mb-3" />
          <p className="text-surface-500 text-sm">
            未找到 "{taskFilter}" 的审计日志。
          </p>
          <p className="text-surface-600 text-xs mt-1">
            请确认任务 ID 正确，且该任务已执行。
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[160px_1fr_auto] gap-3 px-3 py-2 text-xs font-medium text-surface-500 border-b border-surface-700">
            <span>时间</span>
            <span>事件</span>
            <span className="text-right text-surface-600">
              {events.length} 条事件
            </span>
          </div>
          {events.map((evt, i) => (
            <div
              key={i}
              className="grid grid-cols-[160px_1fr_auto] gap-3 px-3 py-2 text-xs hover:bg-surface-800/50 rounded"
            >
              <span className="text-surface-500 font-mono">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-surface-300 font-mono">{evt.event_type}</span>
              <span className="text-surface-500 truncate font-mono max-w-[280px]">
                {JSON.stringify(evt.data).slice(0, 80)}
              </span>
            </div>
          ))}
        </div>
      )}
      </div>
      {/* 内容区结束 */}
    </div>
  );
}
