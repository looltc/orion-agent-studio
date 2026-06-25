import type { AgentMetrics } from "@/types/agent";

interface Props {
  metrics: AgentMetrics;
  compact?: boolean;
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function AgentMetricsDisplay({ metrics, compact }: Props) {
  const items: { label: string; value: string; key: string }[] = [
    { key: "tasks", label: "任务", value: formatNum(metrics.tasks) },
    { key: "success", label: "成功率", value: `${metrics.successRate}%` },
    { key: "memory", label: "记忆", value: formatNum(metrics.memoryCount) },
  ];

  if (!compact && metrics.cost) {
    items.push({ key: "cost", label: "费用", value: metrics.cost });
  }
  if (!compact && metrics.savedTime) {
    items.push({ key: "time", label: "节省", value: metrics.savedTime });
  }

  return (
    <div className={`flex ${compact ? "gap-3" : "gap-4"}`}>
      {items.map((item) => (
        <div key={item.key} className="text-center min-w-0">
          <p className={`font-semibold tabular-nums
            text-surface-900 dark:text-white
            ${compact ? "text-xs" : "text-sm"}`}>
            {item.value}
          </p>
          <p className={`text-surface-500 dark:text-surface-500
            ${compact ? "text-[10px]" : "text-xs"}`}>
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
