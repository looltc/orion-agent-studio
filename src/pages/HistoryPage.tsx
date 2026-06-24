import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ProtocolTask } from "@/types/protocol";
import rpc from "@/client/rpc";
import StatusBadge from "@/components/StatusBadge";

type TaskTab = "all" | "active" | "completed";

export default function HistoryPage() {
  const [tasks, setTasks] = useState<ProtocolTask[]>([]);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<TaskTab>("all");
  const navigate = useNavigate();

  const loadTasks = useCallback(async () => {
    try {
      const all = await rpc.listTasks();
      setTasks(all);
    } catch {
      // Daemon not connected
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filtered = (() => {
    let result = tasks;

    if (tab === "active") {
      result = result.filter(
        (t) => t.status === "running" || t.status === "ready" || t.status === "paused"
      );
    } else if (tab === "completed") {
      result = result.filter(
        (t) =>
          t.status === "done" || t.status === "failed" || t.status === "cancelled"
      );
    }

    if (filter) {
      result = result.filter(
        (t) =>
          t.goal.toLowerCase().includes(filter.toLowerCase()) ||
          t.task_id.includes(filter) ||
          (t.result_summary || "").toLowerCase().includes(filter.toLowerCase())
      );
    }

    return result;
  })();

  const tabs: { key: TaskTab; label: string }[] = [
    { key: "all", label: "All Tasks" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">History</h1>
          <p className="text-sm text-surface-500 mt-0.5">All task records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTasks}
            className="p-2 rounded-lg hover:bg-surface-800 text-surface-400"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface-900 border border-surface-700 rounded-lg p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  tab === t.key
                    ? "bg-orion-600/20 text-orion-400"
                    : "text-surface-400 hover:bg-surface-800 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-600"
        />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search tasks by goal, ID, or result…"
          className="w-full bg-surface-900 border border-surface-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-surface-600 outline-none focus:border-orion-600/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Filter size={40} className="mx-auto text-surface-700 mb-3" />
          <p className="text-surface-500 text-sm">
            {filter ? "No matching tasks." : "No tasks recorded yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div
              key={t.task_id}
              onClick={() => navigate(`/task/${t.task_id}`)}
              className="flex items-center gap-4 bg-surface-900 border border-surface-700 rounded-lg px-4 py-3 hover:border-surface-600 cursor-pointer transition-colors"
            >
              <StatusBadge status={t.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{t.goal}</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  {t.iterations} steps ·{" "}
                  {new Date(t.created_at).toLocaleDateString()}
                </p>
              </div>
              {t.result_summary && (
                <p className="text-xs text-surface-400 truncate max-w-[200px]">
                  {t.result_summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
