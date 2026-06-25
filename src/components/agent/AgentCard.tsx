import { useState, useEffect } from "react";
import { MessageCircle, Settings, Users, Cpu } from "lucide-react";
import type { Agent } from "@/types/agent";
import type { LLMProvider } from "@/types/provider";
import { agentStore } from "@/store/agentStore";
import AgentStatusBadge from "./AgentStatusBadge";
import AgentCapabilityTags from "./AgentCapabilityTags";
import AgentMetricsDisplay from "./AgentMetrics";

interface Props {
  agent: Agent;
  onChat: (agent: Agent) => void;
  onConfigure: (agent: Agent) => void;
}

export default function AgentCard({ agent, onChat, onConfigure }: Props) {
  const initials = agent.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const subCount = agent.organization?.subAgentCount;
  const created = new Date(agent.createdAt).toLocaleDateString();
  const [modelLabel, setModelLabel] = useState("");

  useEffect(() => {
    if (!agent.llm_provider_id) return;
    agentStore.loadProviders().then((ps: LLMProvider[]) => {
      const p = ps.find(x => x.id === agent.llm_provider_id);
      setModelLabel(p?.model || p?.name || "");
    }).catch(() => {});
  }, [agent.llm_provider_id]);

  return (
    <div
      className="relative group bg-white dark:bg-surface-900
        border border-surface-200 dark:border-surface-700
        rounded-card p-5
        hover:border-orion-400/40 dark:hover:border-orion-600/40
        hover:shadow-lg hover:shadow-surface-200/50 dark:hover:shadow-black/30
        hover:-translate-y-0.5
        transition-all duration-200 cursor-pointer
        flex flex-col gap-4"
      onClick={() => onChat(agent)}
    >
      {/* Top-right: Configure icon (absolute, never scrolls) */}
      <button
        onClick={e => { e.stopPropagation(); onConfigure(agent); }}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg
          text-surface-400 hover:text-surface-600 dark:hover:text-white
          hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        title="配置"
      >
        <Settings size={15} />
      </button>

      {/* Row 1: Avatar + Identity + Model */}
      <div className="flex items-start gap-3 pr-7">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orion-500 to-orion-700
          flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-surface-900 dark:text-white truncate">{agent.name}</h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 truncate">{agent.role}</p>
        </div>
        {modelLabel && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill
            bg-surface-100 dark:bg-surface-800 text-[10px] text-surface-500 dark:text-surface-400 font-mono shrink-0">
            <Cpu size={10} />{modelLabel}
          </span>
        )}
      </div>

      {/* Row 2: Status */}
      <div>
        <AgentStatusBadge status={agent.status.state} />
        {agent.status.message && (
          <span className="text-xs text-surface-500 dark:text-surface-500 ml-2">{agent.status.message}</span>
        )}
      </div>

      {/* Row 3: Capabilities */}
      <AgentCapabilityTags capabilities={agent.capabilities} />

      {/* Row 4: Metrics */}
      <AgentMetricsDisplay metrics={agent.metrics} compact />

      {/* Row 5: Bottom bar (mt-auto) */}
      <div className="flex items-center gap-2 pt-2 border-t border-surface-100 dark:border-surface-800 mt-auto"
        onClick={e => e.stopPropagation()}>
        <span className="flex items-center gap-1 text-[11px] text-surface-400 dark:text-surface-500 shrink-0">
          {subCount !== undefined ? <><Users size={11} />{subCount}</> : created}
        </span>
        <button onClick={e => { e.stopPropagation(); onChat(agent); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
            bg-orion-600 hover:bg-orion-700 text-white text-sm font-medium transition-colors">
          <MessageCircle size={14} />对话
        </button>
      </div>
    </div>
  );
}
