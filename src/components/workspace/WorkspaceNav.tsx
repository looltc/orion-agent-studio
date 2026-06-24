import {
  MessageCircle,
  ListTodo,
  Brain,
  Globe,
  Monitor,
  Database,
  BarChart3,
  Settings,
} from "lucide-react";
import type { WorkspaceTab } from "@/types/agent";

interface Props {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}

const TABS: { key: WorkspaceTab; label: string; icon: typeof MessageCircle }[] = [
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "memory", label: "Memory", icon: Brain },
  { key: "browser", label: "Browser", icon: Globe },
  { key: "desktop", label: "Desktop", icon: Monitor },
  { key: "knowledge", label: "Knowledge", icon: Database },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

export default function WorkspaceNav({ activeTab, onTabChange }: Props) {
  return (
    <aside className="w-14 border-l border-surface-200 dark:border-surface-700
      bg-white dark:bg-surface-950
      flex flex-col items-center py-2 gap-0.5 shrink-0">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors
              ${
                isActive
                  ? "bg-orion-50 dark:bg-orion-900/20 text-orion-600 dark:text-orion-400"
                  : "text-surface-400 dark:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-600 dark:hover:text-surface-400"
              }`}
            title={tab.label}
          >
            <Icon size={16} />
            <span className="text-[9px] font-medium leading-none">{tab.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
