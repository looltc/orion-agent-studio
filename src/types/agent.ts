// Agent OS 类型定义 — 与设计文档 Section 11 对齐

export type AgentStatus =
  | "idle"
  | "thinking"
  | "working"
  | "waiting"
  | "need_approval"
  | "error";

export interface AgentCapability {
  key: string;
  label: string;
  enabled: boolean;
  icon?: string;
}

export interface AgentMetrics {
  tasks: number;
  successRate: number;
  cost?: string;
  savedTime?: string;
  memoryCount: number;
  avgLatency?: string;
  failureRate?: number;
  retryRate?: number;
}

export interface AgentPersonality {
  name: string;
  traits: string[];
}

export interface AgentOrganization {
  manager?: string;
  subAgentCount?: number;
}

export interface AgentState {
  state: AgentStatus;
  message: string;
  updatedAt?: string;
  phase?: string;
  currentTool?: string;
  needsApproval?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  version: string;
  owner: string;
  createdAt: string;
  avatar?: string;
  status: AgentState;
  capabilities: AgentCapability[];
  metrics: AgentMetrics;
  personality: AgentPersonality;
  organization?: AgentOrganization;
  system_prompt?: string;
  skills?: string[];
  llm_provider_id?: string;
}

export type WorkspaceMessageType =
  | "message"
  | "thought"
  | "tool_call"
  | "tool_result"
  | "approval"
  | "error"
  | "final_result";

export type WorkspaceMessageStatus =
  | "pending"
  | "running"
  | "success"
  | "warning"
  | "error";

export interface WorkspaceMessage {
  id: string;
  role: "user" | "agent" | "system";
  type: WorkspaceMessageType;
  title?: string;
  content: string;
  timestamp: string;
  status?: WorkspaceMessageStatus;
  collapsed?: boolean;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  approvalId?: string;
  trace?: {
    observe?: string;
    plan?: string;
    act?: string;
    verify?: string;
    reflect?: string;
  };
}

export type WorkspaceTab =
  | "chat"
  | "tasks"
  | "memory"
  | "browser"
  | "desktop"
  | "knowledge"
  | "analytics"
  | "settings";
