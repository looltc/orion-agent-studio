import type { TaskStatus } from "@/types/protocol";

const config: Record<TaskStatus, { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-surface-700 text-surface-300" },
  running: { label: "Running", className: "bg-blue-900/40 text-blue-400" },
  paused: { label: "Paused", className: "bg-yellow-900/40 text-yellow-400" },
  done: { label: "Done", className: "bg-green-900/40 text-green-400" },
  failed: { label: "Failed", className: "bg-red-900/40 text-red-400" },
  cancelled: { label: "Cancelled", className: "bg-surface-700 text-surface-400" },
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = config[status] || config.ready;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${status === "running" ? "bg-blue-400 animate-pulse" : "bg-current"}`} />
      {cfg.label}
    </span>
  );
}
