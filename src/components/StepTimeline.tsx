import type { BusEvent } from "@/types/protocol";
import { CheckCircle, XCircle, ArrowRight, Globe, Monitor, Terminal } from "lucide-react";

interface StepTimelineProps {
  events: BusEvent[];
}

const iconOf = (source: string) => {
  if (source.includes("browser")) return Globe;
  if (source.includes("desktop")) return Monitor;
  if (source.includes("terminal")) return Terminal;
  return ArrowRight;
};

export default function StepTimeline({ events }: StepTimelineProps) {
  if (!events.length) {
    return <p className="text-surface-500 text-sm text-center py-8">No steps recorded yet.</p>;
  }

  return (
    <div className="space-y-0">
      {events.map((evt, i) => {
        const Icon = iconOf(evt.source);
        const isSuccess = evt.type.includes("completed") || evt.type === "task.completed";
        const isFailure = evt.type.includes("failed") || evt.type === "task.failed";

        return (
          <div key={evt.id || i} className="flex gap-3 py-2">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  isSuccess
                    ? "bg-green-900/30 text-green-400"
                    : isFailure
                    ? "bg-red-900/30 text-red-400"
                    : "bg-surface-800 text-surface-400"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle size={14} />
                ) : isFailure ? (
                  <XCircle size={14} />
                ) : (
                  <Icon size={14} />
                )}
              </div>
              {i < events.length - 1 && (
                <div className="w-px flex-1 bg-surface-700 my-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-surface-300">
                  {evt.type}
                </span>
                <span className="text-xs text-surface-600">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {evt.payload && Object.keys(evt.payload).length > 0 && (
                <p className="text-xs text-surface-500 truncate">
                  {JSON.stringify(evt.payload).slice(0, 100)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
