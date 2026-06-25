import type { AgentCapability } from "@/types/agent";
import { Globe, Monitor, Code, Terminal, FileText, Database } from "lucide-react";

const CAPABILITY_ICONS: Record<string, typeof Globe> = {
  browser: Globe,
  desktop: Monitor,
  coding: Code,
  terminal: Terminal,
  files: FileText,
  knowledge: Database,
};

interface Props {
  capabilities: AgentCapability[];
  max?: number;
}

export default function AgentCapabilityTags({ capabilities, max = 5 }: Props) {
  const visible = capabilities.filter((c) => c.enabled).slice(0, max);
  const overflow = capabilities.filter((c) => c.enabled).length - max;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((cap) => {
        const Icon = CAPABILITY_ICONS[cap.key];
        return (
          <span
            key={cap.key}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-medium
              bg-surface-100 text-surface-600 border border-surface-200
              dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700"
          >
            {Icon && <Icon size={10} />}
            {cap.label}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium
          bg-surface-100 text-surface-500 border border-surface-200
          dark:bg-surface-800 dark:text-surface-500 dark:border-surface-700">
          +{overflow}
        </span>
      )}
    </div>
  );
}
