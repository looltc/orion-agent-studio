import { Loader2, CheckCircle2, Clock, AlertCircle, HelpCircle, XCircle } from "lucide-react";
import type { AgentStatus } from "@/types/agent";

const config: Record<
  AgentStatus,
  { label: string; Icon: typeof Clock; className: string; dotClass: string }
> = {
  idle: {
    label: "Idle",
    Icon: Clock,
    className:
      "bg-surface-200 text-surface-600 dark:bg-surface-800 dark:text-surface-400",
    dotClass: "bg-surface-400 dark:bg-surface-500",
  },
  thinking: {
    label: "Thinking",
    Icon: Loader2,
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dotClass: "bg-blue-500 animate-pulse",
  },
  working: {
    label: "Working",
    Icon: Loader2,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dotClass: "bg-emerald-500 animate-pulse",
  },
  waiting: {
    label: "Waiting",
    Icon: Clock,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  need_approval: {
    label: "Need Approval",
    Icon: HelpCircle,
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    dotClass: "bg-purple-500 animate-pulse",
  },
  error: {
    label: "Error",
    Icon: AlertCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dotClass: "bg-red-500",
  },
};

interface Props {
  status: AgentStatus;
  compact?: boolean;
}

export default function AgentStatusBadge({ status, compact }: Props) {
  const cfg = config[status] || config.idle;
  const Icon = cfg.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotClass}`} />
      {!compact && (
        <>
          <span>{cfg.label}</span>
          {(status === "thinking" || status === "working") && (
            <Icon size={10} className="animate-spin ml-0.5" />
          )}
        </>
      )}
    </span>
  );
}
