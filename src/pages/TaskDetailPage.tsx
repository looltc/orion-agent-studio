import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Play, Pause, Square } from "lucide-react";
import type { ProtocolTask, BusEvent } from "@/types/protocol";
import rpc from "@/client/rpc";
import StatusBadge from "@/components/StatusBadge";
import StepTimeline from "@/components/StepTimeline";

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<ProtocolTask | null>(null);
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [taskId]);

  const loadData = async () => {
    try {
      const t = await rpc.getTask(taskId!);
      setTask(t);

      // 加载事件（replay）
      if (t.run_id) {
        const evts = await rpc.replayTask(t.run_id);
        setEvents(evts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!taskId) return;
    await rpc.pauseTask(taskId);
    await loadData();
  };

  const handleResume = async () => {
    if (!taskId) return;
    await rpc.resumeTask(taskId);
    await loadData();
  };

  const handleCancel = async () => {
    if (!taskId) return;
    await rpc.cancelTask(taskId);
    await loadData();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <RefreshCw size={24} className="animate-spin text-surface-600" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <p className="text-surface-500">未找到任务。</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-400"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">{task.goal}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={task.status} />
            <span className="text-xs text-surface-600 font-mono">
              {task.task_id}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {task.status === "running" && (
            <button
              onClick={handlePause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-800 text-yellow-400 hover:bg-yellow-900/20 text-xs font-medium"
            >
              <Pause size={14} /> 暂停
            </button>
          )}
          {task.status === "paused" && (
            <button
              onClick={handleResume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-800 text-green-400 hover:bg-green-900/20 text-xs font-medium"
            >
              <Play size={14} /> 继续
            </button>
          )}
          {(task.status === "running" || task.status === "paused" || task.status === "ready") && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 text-xs font-medium"
            >
              <Square size={14} /> 取消
            </button>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <InfoCard label="步骤" value={String(task.iterations)} />
        <InfoCard label="优先级" value={String(task.priority)} />
        <InfoCard label="创建时间" value={new Date(task.created_at).toLocaleString()} />
        <InfoCard
          label="结果"
          value={task.result_summary || task.error || "—"}
          highlight={task.status === "done"}
        />
      </div>

      {/* Result */}
      {task.result_summary && (
        <div className="mb-6 p-4 bg-green-900/10 border border-green-900/30 rounded-lg">
          <p className="text-xs text-surface-500 mb-1">结果</p>
          <p className="text-sm text-green-300">{task.result_summary}</p>
        </div>
      )}
      {task.error && (
        <div className="mb-6 p-4 bg-red-900/10 border border-red-900/30 rounded-lg">
          <p className="text-xs text-surface-500 mb-1">错误</p>
          <p className="text-sm text-red-300">{task.error}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-surface-400 mb-3">
          执行时间线（共 {events.length} 个事件）
        </h2>
        <StepTimeline events={events} />
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-lg p-3">
      <p className="text-xs text-surface-500 mb-0.5">{label}</p>
      <p className={`text-sm truncate ${highlight ? "text-green-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
