import { Play, Pause, Square, ChevronRight, Clock } from "lucide-react";
import type { ProtocolTask } from "@/types/protocol";
import StatusBadge from "./StatusBadge";

interface TaskCardProps {
  task: ProtocolTask;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onClick?: (task: ProtocolTask) => void;
}

export default function TaskCard({ task, onPause, onResume, onCancel, onClick }: TaskCardProps) {
  const isActive = task.status === "running" || task.status === "ready";

  return (
    <div
      className="bg-surface-900 border border-surface-700 rounded-lg p-4 hover:border-surface-600 transition-colors cursor-pointer"
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={task.status} />
          <span className="text-xs text-surface-500 font-mono">{task.task_id.slice(0, 12)}</span>
        </div>
        {isActive && (
          <div className="flex items-center gap-1">
            {task.status === "running" && (
              <button
                onClick={(e) => { e.stopPropagation(); onPause?.(task.task_id); }}
                className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-yellow-400"
                title="Pause"
              >
                <Pause size={14} />
              </button>
            )}
            {task.status === "ready" && (
              <button
                onClick={(e) => { e.stopPropagation(); onResume?.(task.task_id); }}
                className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-green-400"
                title="Start"
              >
                <Play size={14} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onCancel?.(task.task_id); }}
              className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-red-400"
              title="Cancel"
            >
              <Square size={14} />
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-white mb-2 line-clamp-2">{task.goal}</p>

      <div className="flex items-center gap-4 text-xs text-surface-500">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {task.iterations} steps
        </span>
        {task.result_summary && (
          <span className="text-surface-400 truncate max-w-[200px]">
            {task.result_summary}
          </span>
        )}
        {task.error && (
          <span className="text-red-400 truncate max-w-[200px]">⚠ {task.error}</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-surface-600">
          {new Date(task.created_at).toLocaleTimeString()}
        </span>
        <ChevronRight size={14} className="text-surface-600" />
      </div>
    </div>
  );
}
