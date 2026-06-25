import type { TaskStatus } from "@/types/protocol";

const config: Record<TaskStatus, { label: string; className: string }> = {
  ready: {
    label: "Ready",
    className:
      "bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
  },
  running: {
    label: "Running",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  paused: {
    label: "Paused",
    className:
      "bg-amber-100 text-amber-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  },
  done: {
    label: "Done",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-green-900/40 dark:text-green-400",
  },
  failed: {
    label: "Failed",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400",
  },
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = config[status] || config.ready;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${status === "running" ? "bg-blue-500 animate-pulse" : "bg-current"}`}
      />
      {cfg.label}
    </span>
  );
}
