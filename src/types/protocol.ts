// 协议类型 —— 与 Python protocol/models.py 对齐

export type TaskStatus =
  | "ready"
  | "running"
  | "paused"
  | "done"
  | "failed"
  | "cancelled";

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ApprovalAction = "approve" | "reject";

export interface ProtocolTask {
  task_id: string;
  goal: string;
  status: TaskStatus;
  priority: number;
  created_at: string;
  updated_at: string;
  result_summary: string | null;
  run_id: string | null;
  iterations: number;
  error: string | null;
}

export interface ProtocolStep {
  step_id: string;
  task_id: string;
  step_index: number;
  type: string;
  tool: string | null;
  arguments: Record<string, unknown>;
  risk_level: RiskLevel;
  status: StepStatus;
  output: unknown;
  error: string | null;
}

export interface ProtocolSnapshot {
  world_state: Record<string, unknown>;
  current_task: ProtocolTask | null;
  current_step: ProtocolStep | null;
  open_windows: string[];
  open_tabs: string[];
  notifications: string[];
  last_action_result: unknown;
  timestamp: string;
}

export interface ApprovalRequest {
  approval_id: string;
  task_id: string;
  step_id: string | null;
  tool: string;
  arguments: Record<string, unknown>;
  risk_level: RiskLevel;
  reason: string;
}

export interface AuditEvent {
  timestamp: string;
  run_id: string;
  event_type: string;
  data: Record<string, unknown>;
}

export interface BusEvent {
  id: string;
  timestamp: string;
  source: string;
  type: string;
  task_id: string | null;
  run_id: string | null;
  payload: Record<string, unknown>;
}

// RPC response wrapper
export interface RpcResult<T = unknown> {
  tasks?: T[];
  task?: T;
  count?: number;
  audit_logs?: AuditEvent[];
  events?: BusEvent[];
  total?: number;
  world_state?: Record<string, unknown>;
  running?: boolean;
  port?: number;
  active_tasks?: number;
  error?: string;
  ok?: boolean;
}
