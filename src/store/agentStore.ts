// Agent 数据持久化层
// Desktop: Electron IPC → 本地文件
// Web: localStorage

import type { Agent } from "@/types/agent";
import type { LLMProvider } from "@/types/provider";

const STORAGE_KEY = "orion_agents";
const PROVIDER_STORAGE_KEY = "orion_providers";

// ── 检测运行环境 ──
function isElectron(): boolean {
  return typeof window !== "undefined" && !!(window as any).electronAPI;
}

// ── Electron IPC 调用 ──
async function electronLoad(): Promise<Agent[]> {
  const api = (window as any).electronAPI;
  if (api?.loadAgents) return api.loadAgents();
  return [];
}

async function electronSave(agents: Agent[]): Promise<void> {
  const api = (window as any).electronAPI;
  if (api?.saveAgents) await api.saveAgents(agents);
}

// ── localStorage 读写 ──
function localLoad(): Agent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function localSave(agents: Agent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

// ── 默认 Agent 模板 ──
export const DEFAULT_AGENTS: Agent[] = [
  {
    id: "orion-architect",
    name: "Orion Architect",
    role: "Software Architect",
    version: "1.0.0",
    owner: "admin",
    createdAt: new Date().toISOString(),
    status: { state: "idle", message: "Ready for tasks" },
    capabilities: [
      { key: "browser", label: "Browser", enabled: true },
      { key: "desktop", label: "Desktop", enabled: true },
      { key: "coding", label: "Coding", enabled: true },
      { key: "terminal", label: "Terminal", enabled: true },
      { key: "files", label: "Files", enabled: true },
      { key: "knowledge", label: "Knowledge", enabled: true },
    ],
    metrics: { tasks: 0, successRate: 100, memoryCount: 0 },
    personality: { name: "Architect", traits: ["precise", "structured"] },
  },
];

export const CAPABILITY_OPTIONS = [
  { key: "browser", label: "Browser" },
  { key: "desktop", label: "Desktop" },
  { key: "coding", label: "Coding" },
  { key: "terminal", label: "Terminal" },
  { key: "files", label: "Files" },
  { key: "knowledge", label: "Knowledge" },
] as const;

// ── 统一 API ──
export const agentStore = {
  async load(): Promise<Agent[]> {
    if (isElectron()) {
      const agents = await electronLoad();
      return agents.length > 0 ? agents : DEFAULT_AGENTS;
    }
    const agents = localLoad();
    return agents.length > 0 ? agents : DEFAULT_AGENTS;
  },

  async save(agents: Agent[]): Promise<void> {
    if (isElectron()) {
      await electronSave(agents);
    } else {
      localSave(agents);
    }
  },

  async create(partial: Omit<Agent, "id" | "createdAt" | "metrics" | "status"> & {
    system_prompt?: string;
    skills?: string[];
    llm_provider_id?: string;
  }): Promise<Agent> {
    const agents = await this.load();
    const agent: Agent = {
      ...partial,
      id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      status: { state: "idle", message: "Ready for tasks" },
      metrics: { tasks: 0, successRate: 100, memoryCount: 0 },
      system_prompt: partial.system_prompt,
      skills: partial.skills,
      llm_provider_id: partial.llm_provider_id,
    };
    agents.push(agent);
    await this.save(agents);
    return agent;
  },

  async update(id: string, patch: Partial<Agent> & {
    system_prompt?: string;
    skills?: string[];
    llm_provider_id?: string;
  }): Promise<Agent | null> {
    const agents = await this.load();
    const idx = agents.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    agents[idx] = { ...agents[idx], ...patch, id: agents[idx].id };
    await this.save(agents);
    return agents[idx];
  },

  async remove(id: string): Promise<boolean> {
    const agents = await this.load();
    const filtered = agents.filter((a) => a.id !== id);
    if (filtered.length === agents.length) return false;
    await this.save(filtered);
    return true;
  },

  async getById(id: string): Promise<Agent | null> {
    const agents = await this.load();
    return agents.find((a) => a.id === id) || null;
  },

  // ── Provider CRUD ──
  async loadProviders(): Promise<LLMProvider[]> {
    try {
      const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async saveProviders(providers: LLMProvider[]): Promise<void> {
    localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(providers));
  },

  async createProvider(data: Partial<LLMProvider>): Promise<LLMProvider> {
    const providers = await this.loadProviders();
    const provider: LLMProvider = {
      id: `provider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: data.name || "",
      base_url: data.base_url || "",
      api_key: data.api_key || "",
      model: data.model || "",
      is_default: data.is_default ?? false,
      created_at: new Date().toISOString(),
    };
    providers.push(provider);
    await this.saveProviders(providers);
    return provider;
  },

  async updateProvider(id: string, data: Partial<LLMProvider>): Promise<LLMProvider | null> {
    const providers = await this.loadProviders();
    const idx = providers.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    providers[idx] = { ...providers[idx], ...data, id: providers[idx].id };
    await this.saveProviders(providers);
    return providers[idx];
  },

  async deleteProvider(id: string): Promise<boolean> {
    const providers = await this.loadProviders();
    const filtered = providers.filter((p) => p.id !== id);
    if (filtered.length === providers.length) return false;
    await this.saveProviders(filtered);
    return true;
  },
};
