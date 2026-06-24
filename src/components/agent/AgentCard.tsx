import { MessageCircle, Settings } from "lucide-react";
import type { Agent } from "@/types/agent";
import AgentStatusBadge from "./AgentStatusBadge";
import AgentCapabilityTags from "./AgentCapabilityTags";
import AgentMetricsDisplay from "./AgentMetrics";

interface Props {
  agent: Agent;
  onChat: (agent: Agent) => void;
  onConfigure: (agent: Agent) => void;
}

export default function AgentCard({ agent, onChat, onConfigure }: Props) {
  const initials = agent.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="group relative bg-white dark:bg-surface-900
        border border-surface-200 dark:border-surface-700
        rounded-card p-5
        hover:border-orion-400/40 dark:hover:border-orion-600/40
        hover:shadow-lg hover:shadow-surface-200/50 dark:hover:shadow-black/30
        hover:-translate-y-0.5
        transition-all duration-200 cursor-pointer
        flex flex-col gap-4"
      onClick={() => onChat(agent)}
    >
      {/* Header: Avatar + Name + Role */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orion-500 to-orion-700
          flex items-center justify-center shrink-0
          ring-2 ring-transparent group-hover:ring-orion-400/30 transition-all">
          <span className="text-white font-bold text-sm">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-surface-900 dark:text-white truncate">
            {agent.name}
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 truncate">
            {agent.role}
          </p>
        </div>
      </div>

      {/* Status */}
      <div>
        <AgentStatusBadge status={agent.status.state} />
        {agent.status.message && (
          <p className="text-xs text-surface-500 dark:text-surface-500 mt-1.5 truncate">
            {agent.status.message}
          </p>
        )}
      </div>

      {/* Capabilities */}
      <AgentCapabilityTags capabilities={agent.capabilities} />

      {/* Metrics */}
      <AgentMetricsDisplay metrics={agent.metrics} compact />

      {/* Actions */}
      <div
        className="flex gap-2 pt-1 border-t border-surface-100 dark:border-surface-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChat(agent);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg
            bg-orion-600 hover:bg-orion-700 text-white text-xs font-medium
            transition-colors"
        >
          <MessageCircle size={12} />
          Chat
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfigure(agent);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg
            border border-surface-200 dark:border-surface-700
            text-surface-600 dark:text-surface-400
            hover:bg-surface-100 dark:hover:bg-surface-800
            text-xs font-medium transition-colors"
        >
          <Settings size={12} />
          Configure
        </button>
      </div>
    </div>
  );
}
