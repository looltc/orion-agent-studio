// Agent & Provider 数据持久化层
// 主存储：后端 Runtime Daemon（权威源）
// 本地 localStorage 作为离线缓存，上线后优先从后端同步

import type { Agent } from "@/types/agent";
import type { LLMProvider } from "@/types/provider";
import rpc from "@/client/rpc";

const CACHE_KEY = "orion_agents_cache";
const PROVIDER_CACHE_KEY = "orion_providers_cache";

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

// ── localStorage 缓存读写 ──
function localCacheLoad(): Agent[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function localCacheSave(agents: Agent[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(agents));
}

function localCacheLoadProviders(): LLMProvider[] {
  try {
    const raw = localStorage.getItem(PROVIDER_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function localCacheSaveProviders(providers: LLMProvider[]): void {
  localStorage.setItem(PROVIDER_CACHE_KEY, JSON.stringify(providers));
}

// ── 默认值 ──
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

export const DEFAULT_PROVIDERS: LLMProvider[] = [
  {
    id: "provider-default-lmstudio",
    name: "LM Studio (Local)",
    base_url: "http://localhost:1234/v1",
    api_key: "local-1234567890abcdef",
    model: "local-model",
    is_default: true,
    created_at: new Date().toISOString(),
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

// ── 统一 API（后端为权威源）──
export const agentStore = {
  // 加载 Agent 列表
  // 优先从后端加载；后端不可用时降级到 localStorage 缓存或默认值
  async load(): Promise<Agent[]> {
    try {
      if (rpc.connected) {
        const result = await rpc.call("agent.list", {}) as any;
        // 后端返回 { agents: [...] }
        const agents = result.agents || [];
        localCacheSave(agents);
        return agents;
      }
    } catch (e) {
      console.warn("[agentStore] 后端加载失败，使用本地缓存:", e);
    }
    // 离线降级：尝试 localStorage 缓存 → Electron IPC → 默认值
    const cached = localCacheLoad();
    if (cached.length > 0) return cached;
    if (isElectron()) {
      const fromIpc = await electronLoad();
      if (fromIpc.length > 0) return fromIpc;
    }
    return DEFAULT_AGENTS;
  },

  // 创建 Agent — 调用后端 agent.create
  // 后端期望：name, role, system_prompt 等独立字段（非嵌套 config 对象）
  async create(partial: Omit<Agent, "id" | "createdAt" | "metrics" | "status"> & {
    system_prompt?: string;
    skills?: string[];
    llm_provider_id?: string;
  }): Promise<Agent> {
    const now = new Date().toISOString();
    const agent: Agent = {
      ...partial,
      id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      status: { state: "idle", message: "Ready for tasks" },
      metrics: { tasks: 0, successRate: 100, memoryCount: 0 },
      system_prompt: partial.system_prompt,
      skills: partial.skills,
      llm_provider_id: partial.llm_provider_id,
    };
    // 优先写入后端（失败不阻塞，继续写入本地缓存）
    if (rpc.connected) {
      try {
        await rpc.call("agent.create", {
          name: agent.name,
          role: agent.role,
          system_prompt: agent.system_prompt || "",
          skills: agent.skills || [],
          llm_provider_id: agent.llm_provider_id || "",
          personality_name: agent.personality?.name || "",
          personality_traits: agent.personality?.traits || [],
        });
      } catch (e) {
        console.warn("[agentStore] 后端创建 Agent 失败，已降级到本地缓存:", e);
      }
    } else {
      console.warn("[agentStore] 后端不可用，Agent 仅写入本地缓存（重启后将丢失）");
    }
    // 更新本地缓存
    const agents = await this.load();
    agents.push(agent);
    localCacheSave(agents);
    return agent;
  },

  // 更新 Agent — 调用后端 agent.update
  // 后端期望：id + 各字段独立（params.pop("id") 取出 id，其余作为参数）
  async update(id: string, patch: Partial<Agent> & {
    system_prompt?: string;
    skills?: string[];
    llm_provider_id?: string;
  }): Promise<Agent | null> {
    // 优先更新后端（失败不阻塞，继续写入本地缓存）
    if (rpc.connected) {
      try {
        const payload: Record<string, unknown> = { id };
        if (patch.name !== undefined) payload.name = patch.name;
        if (patch.role !== undefined) payload.role = patch.role;
        if (patch.system_prompt !== undefined) payload.system_prompt = patch.system_prompt;
        if (patch.skills !== undefined) payload.skills = patch.skills;
        if (patch.llm_provider_id !== undefined) payload.llm_provider_id = patch.llm_provider_id;
        if (patch.personality !== undefined) {
          payload.personality_name = patch.personality.name;
          payload.personality_traits = patch.personality.traits;
        }
        const result = await rpc.call("agent.update", payload) as any;
        if (result?.error) {
          throw new Error(result.error);
        }
      } catch (e) {
        console.warn("[agentStore] 后端更新 Agent 失败，已降级到本地缓存:", e);
      }
    } else {
      console.warn("[agentStore] 后端不可用，Agent 更新仅写入本地缓存（重启后将丢失）");
    }
    const agents = await this.load();
    const idx = agents.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    agents[idx] = { ...agents[idx], ...patch, id: agents[idx].id };
    localCacheSave(agents);
    return agents[idx];
  },

  // 删除 Agent — 调用后端 agent.delete
  async remove(id: string): Promise<boolean> {
    if (rpc.connected) {
      try {
        await rpc.call("agent.delete", { id });
      } catch (e) {
        console.warn("[agentStore] 后端删除 Agent 失败，已降级到本地缓存:", id, e);
      }
    } else {
      console.warn("[agentStore] 后端不可用，Agent 删除仅在本地缓存中生效");
    }
    // 刷新本地缓存
    const agents = await this.load();
    const filtered = agents.filter((a) => a.id !== id);
    if (filtered.length === agents.length) return false;
    localCacheSave(filtered);
    return true;
  },

  async getById(id: string): Promise<Agent | null> {
    const agents = await this.load();
    return agents.find((a) => a.id === id) || null;
  },

  // ── Provider CRUD（后端为权威源）──
  async loadProviders(): Promise<LLMProvider[]> {
    try {
      if (rpc.connected) {
        const result = await rpc.call("provider.list", {}) as any;
        // 后端返回 { providers: [...] }
        const providers = result.providers || [];
        localCacheSaveProviders(providers);
        return providers;
      }
    } catch (e) {
      console.warn("[agentStore] 后端加载 Provider 失败，使用本地缓存:", e);
    }
    const cached = localCacheLoadProviders();
    return cached.length > 0 ? cached : DEFAULT_PROVIDERS;
  },

  async createProvider(data: Partial<LLMProvider>): Promise<LLMProvider> {
    // 清除其他 provider 的默认标志
    if (data.is_default) {
      const list = await this.loadProviders();
      for (const p of list) p.is_default = false;
    }
    const provider: LLMProvider = {
      id: `provider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: data.name || "",
      base_url: data.base_url || "",
      api_key: data.api_key || "",
      model: data.model || "",
      is_default: data.is_default ?? false,
      created_at: new Date().toISOString(),
    };
    if (rpc.connected) {
      try {
        // 后端期望独立字段：name, base_url, api_key, model, is_default
        await rpc.call("provider.create", {
          name: provider.name,
          base_url: provider.base_url,
          api_key: provider.api_key,
          model: provider.model,
          is_default: provider.is_default,
        });
      } catch (e) {
        console.warn("[agentStore] 后端创建 Provider 失败:", e);
      }
    }
    const list = await this.loadProviders();
    list.push(provider);
    localCacheSaveProviders(list);
    return provider;
  },

  async updateProvider(id: string, data: Partial<LLMProvider>): Promise<LLMProvider | null> {
    if (data.is_default) {
      const list = await this.loadProviders();
      for (const p of list) p.is_default = false;
    }
    // 优先更新后端
    if (rpc.connected) {
      try {
        // 后端期望：id + 各字段独立（params.pop("id") 取出 id）
        const payload: Record<string, unknown> = { id };
        if (data.name !== undefined) payload.name = data.name;
        if (data.base_url !== undefined) payload.base_url = data.base_url;
        if (data.api_key !== undefined) payload.api_key = data.api_key;
        if (data.model !== undefined) payload.model = data.model;
        if (data.is_default !== undefined) payload.is_default = data.is_default;
        await rpc.call("provider.update", payload);
      } catch (e) {
        console.warn("[agentStore] 后端更新 Provider 失败:", id, e);
      }
    }
    const list = await this.loadProviders();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, id: list[idx].id };
    localCacheSaveProviders(list);
    return list[idx];
  },

  async deleteProvider(id: string): Promise<boolean> {
    if (rpc.connected) {
      try {
        await rpc.call("provider.delete", { id });
      } catch (e) {
        console.warn("[agentStore] 后端删除 Provider 失败:", id, e);
      }
    }
    const list = await this.loadProviders();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length === list.length) return false;
    localCacheSaveProviders(filtered);
    return true;
  },
};
