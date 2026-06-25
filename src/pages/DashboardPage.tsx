import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Trash2, Check, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Agent, AgentStatus } from "@/types/agent";
import type { LLMProvider } from "@/types/provider";
import { agentStore, CAPABILITY_OPTIONS } from "@/store/agentStore";
import AgentCard from "@/components/agent/AgentCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import rpc from "@/client/rpc";

const AVAILABLE_SKILLS = ["generate-daily-report", "summarize-meeting"];

const STATUS_FILTERS: { key: AgentStatus | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "working", label: "工作中" },
  { key: "thinking", label: "思考中" },
  { key: "waiting", label: "等待中" },
  { key: "idle", label: "空闲" },
  { key: "need_approval", label: "待审批" },
  { key: "error", label: "错误" },
];

interface FormData {
  name: string;
  role: string;
  traits: string;
  capabilities: string[];
  systemPrompt: string;
  skills: string[];
  llmProviderId: string;
}

const emptyForm: FormData = {
  name: "",
  role: "",
  traits: "",
  capabilities: ["coding"],
  systemPrompt: "",
  skills: [],
  llmProviderId: "",
};

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    agentStore.load().then(setAgents);
  }, []);

  const refresh = () => agentStore.load().then(setAgents);

  const filtered = useMemo(() => {
    let result = agents;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status.state === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.personality.traits.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [agents, search, statusFilter]);

  const handleChat = (agent: Agent) => navigate(`/agent/${agent.id}`);
  const handleConfigure = (agent: Agent) => {
    setEditingAgent(agent);
    loadProvidersForForm();
    setForm({
      name: agent.name,
      role: agent.role,
      traits: agent.personality.traits.join(", "),
      capabilities: agent.capabilities.filter((c) => c.enabled).map((c) => c.key),
      systemPrompt: agent.system_prompt || "",
      skills: agent.skills || [],
      llmProviderId: agent.llm_provider_id || "",
    });
  };

  const loadProvidersForForm = async () => {
    setProvidersLoading(true);
    try {
      if (rpc.connected) {
        const list = await rpc.listProviders();
        setProviders(list);
      } else {
        const list = await agentStore.loadProviders();
        setProviders(list);
      }
    } catch {
      const list = await agentStore.loadProviders();
      setProviders(list);
    } finally {
      setProvidersLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.role.trim()) return;
    await agentStore.create({
      name: form.name.trim(),
      role: form.role.trim(),
      version: "1.0.0",
      owner: "admin",
      personality: {
        name: form.name.trim(),
        traits: form.traits
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      },
      capabilities: CAPABILITY_OPTIONS.map((c) => ({
        ...c,
        enabled: form.capabilities.includes(c.key),
      })),
      system_prompt: form.systemPrompt.trim() || undefined,
      skills: form.skills.length > 0 ? form.skills : undefined,
      llm_provider_id: form.llmProviderId || undefined,
    });
    setShowCreate(false);
    setForm(emptyForm);
    refresh();
  };

  const handleUpdate = async () => {
    if (!editingAgent || !form.name.trim()) return;
    await agentStore.update(editingAgent.id, {
      name: form.name.trim(),
      role: form.role.trim(),
      personality: {
        name: form.name.trim(),
        traits: form.traits
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      },
      capabilities: CAPABILITY_OPTIONS.map((c) => ({
        ...c,
        enabled: form.capabilities.includes(c.key),
      })),
      system_prompt: form.systemPrompt.trim() || undefined,
      skills: form.skills.length > 0 ? form.skills : undefined,
      llm_provider_id: form.llmProviderId || undefined,
    });
    setEditingAgent(null);
    setForm(emptyForm);
    refresh();
  };

  const handleDelete = async () => {
    if (!editingAgent) return;
    await agentStore.remove(editingAgent.id);
    setEditingAgent(null);
    setForm(emptyForm);
    refresh();
  };

  const handleDeleteConfirm = async () => {
    if (!editingAgent) return;
    await agentStore.remove(editingAgent.id);
    setShowDeleteConfirm(false);
    setEditingAgent(null);
    setForm(emptyForm);
    refresh();
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const workingCount = agents.filter(
    (a) => a.status.state === "working" || a.status.state === "thinking"
  ).length;

  const toggleCapability = (key: string) => {
    setForm((f) => ({
      ...f,
      capabilities: f.capabilities.includes(key)
        ? f.capabilities.filter((k) => k !== key)
        : [...f.capabilities, key],
    }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header（固定不滚动） */}
      <div className="shrink-0 px-6 pt-6 pb-4 max-w-6xl w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white mb-1">
              Agent 团队
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {agents.length} 个 Agent · {workingCount} 个活跃
            </p>
          </div>
          <button
            onClick={() => {
              setForm(emptyForm);
              setShowCreate(true);
              loadProvidersForForm();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            新建 Agent
          </button>
        </div>
      </div>

      {/* 内容区（独立滚动） */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 max-w-6xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索 Agent..."
            className="w-full bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg pl-9 pr-4 py-2 text-sm text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-600 outline-none focus:border-orion-500/50"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? "bg-orion-600 text-white"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-surface-500 text-sm">
            {search ? "没有匹配的 Agent。" : agents.length === 0 ? "还没有 Agent，先创建你的第一个 Agent 吧！" : "该状态下没有 Agent。"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onChat={handleChat} onConfigure={handleConfigure} />
          ))}
        </div>
      )}
      </div>
      {/* 内容区结束 */}

      {/* Create / Edit Dialog */}
      {(showCreate || editingAgent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
              <h3 className="font-semibold text-surface-900 dark:text-white">
                {editingAgent ? "编辑 Agent" : "新建 Agent"}
              </h3>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto shrink min-h-0">
              <div>
                <label className="text-xs text-surface-500 mb-1 block">名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50"
                  placeholder="Orion Architect"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 mb-1 block">角色</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50"
                  placeholder="Software Architect"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 mb-1 block">性格特质（逗号分隔）</label>
                <input
                  type="text"
                  value={form.traits}
                  onChange={(e) => setForm({ ...form, traits: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50"
                  placeholder="precise, structured"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 mb-2 block">能力</label>
                <div className="flex flex-wrap gap-2">
                  {CAPABILITY_OPTIONS.map((cap) => (
                    <button
                      key={cap.key}
                      onClick={() => toggleCapability(cap.key)}
                      className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                        form.capabilities.includes(cap.key)
                          ? "bg-orion-600 text-white"
                          : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
                      }`}
                    >
                      {cap.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 系统提示词 */}
              <div>
                <label className="text-xs text-surface-500 mb-1 block">系统提示词</label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  rows={6}
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50 resize-vertical"
                  placeholder="你是一个资深软件架构师。擅长系统设计与代码审查。用简洁精确的中文回复。"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="text-xs text-surface-500 mb-2 block">技能</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          skills: f.skills.includes(skill)
                            ? f.skills.filter((s) => s !== skill)
                            : [...f.skills, skill],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors ${
                        form.skills.includes(skill)
                          ? "bg-orion-600 text-white"
                          : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* LLM 提供者 */}
              <div>
                <label className="text-xs text-surface-500 mb-1 block">LLM 提供者</label>
                {providersLoading ? (
                  <p className="text-xs text-surface-400">加载中…</p>
                ) : (
                  <select
                    value={form.llmProviderId}
                    onChange={(e) => setForm({ ...form, llmProviderId: e.target.value })}
                    className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50"
                  >
                    <option value="">默认（无）</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.model})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-surface-200 dark:border-surface-700 shrink-0">
              {editingAgent && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingAgent(null);
                }}
                className="px-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={editingAgent ? handleUpdate : handleCreate}
                disabled={!form.name.trim() || !form.role.trim()}
                className="px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
              >
                {editingAgent ? "保存" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
