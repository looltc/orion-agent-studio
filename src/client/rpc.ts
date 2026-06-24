// JSON-RPC 客户端 —— 连接 Runtime Daemon
// 支持 WebSocket，含自动重连与状态事件

import type {
  ProtocolTask,
  ApprovalRequest,
  AuditEvent,
  BusEvent,
  RpcResult,
} from "@/types/protocol";
import type { LLMProvider } from "@/types/provider";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 9877;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 10000;
const RPC_TIMEOUT_MS = 30000;
const CONNECT_TIMEOUT_MS = 5000;

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

type ConnectionListener = (status: ConnectionStatus) => void;

interface RpcResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

class RpcClient {
  private host: string;
  private port: number;
  private ws: WebSocket | null = null;
  private idCounter = 0;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private listeners = new Map<string, Set<(data: unknown) => void>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionalClose = false;
  private connListeners = new Set<ConnectionListener>();
  private _status: ConnectionStatus = "disconnected";

  constructor(host: string = DEFAULT_HOST, port: number = DEFAULT_PORT) {
    this.host = host;
    this.port = port;
  }

  // ── 连接状态 ──
  get status(): ConnectionStatus {
    return this._status;
  }

  private setStatus(s: ConnectionStatus) {
    if (this._status === s) return;
    this._status = s;
    this.connListeners.forEach((fn) => fn(s));
  }

  onStatusChange(fn: ConnectionListener) {
    this.connListeners.add(fn);
    return () => {
      this.connListeners.delete(fn);
    };
  }

  // ── 重连 ──
  private scheduleReconnect() {
    if (this.intentionalClose || this.reconnectTimer) return;
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
      RECONNECT_MAX_MS
    );
    this.reconnectAttempt++;
    console.log(`RPC reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        /* next attempt scheduled by onclose */
      });
    }, delay);
  }

  private cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── 重新配置端点 ──
  reconfigure(host: string, port: number) {
    this.host = host;
    this.port = port;
    this.disconnect();
  }

  // ── WebSocket 连接 ──
  private _connectPromise: Promise<void> | null = null;

  connect(): Promise<void> {
    // 正在连接中 → 复用同一个 promise
    if (this._connectPromise) return this._connectPromise;

    this.cancelReconnect();
    this.setStatus("connecting");

    // 主动关闭旧连接（onclose 中 intentionalClose 为 true 不会触发重连）
    this.intentionalClose = true;
    if (this.ws) {
      this.ws.onclose = null; // 阻止旧 onclose 触发
      this.ws.close();
    }
    this.ws = null;
    this.pending.clear();
    this.intentionalClose = false;

    const wsUrl = `ws://${this.host}:${this.port}`;

    this._connectPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          reject(new Error("Connection timeout"));
        }
      }, CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.reconnectAttempt = 0;
        this.setStatus("connected");
        this._connectPromise = null;
        console.log("RPC connected to", wsUrl);
        resolve();
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.jsonrpc === "2.0" && data.id !== undefined) {
            const pending = this.pending.get(data.id);
            if (pending) {
              this.pending.delete(data.id);
              if (data.error) {
                pending.reject(new Error(data.error.message));
              } else {
                pending.resolve(data.result);
              }
            }
          } else if (data.type) {
            const handlers = this.listeners.get(data.type);
            if (handlers) handlers.forEach((h) => h(data));
            const wildcard = this.listeners.get("*");
            if (wildcard) wildcard.forEach((h) => h(data));
          }
        } catch (e) {
          console.warn("RPC parse error:", e);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        this._connectPromise = null;
        // onclose 负责状态清理
      };

      ws.onclose = () => {
        this._connectPromise = null;
        this.setStatus("disconnected");
        console.log("RPC disconnected");
        this.pending.forEach((p) =>
          p.reject(new Error("Connection closed"))
        );
        this.pending.clear();
        if (this.ws === ws) this.ws = null;
        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      };
    });

    return this._connectPromise;
  }

  disconnect() {
    this.intentionalClose = true;
    this.cancelReconnect();
    this.reconnectAttempt = 0;
    this._connectPromise = null;
    if (this.ws) {
      this.ws.onclose = null; // 阻止 onclose 触发重连
      this.ws.close();
    }
    this.ws = null;
    this.pending.clear();
    this.setStatus("disconnected");
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ── WebSocket RPC ──
  async call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = ++this.idCounter;
    const request = {
      jsonrpc: "2.0",
      method,
      params: params || {},
      id,
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(request));

      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`RPC timeout: ${method}`));
        }
      }, RPC_TIMEOUT_MS);
    });
  }

  // ── 事件订阅 ──
  on(eventType: string, handler: (data: unknown) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: (data: unknown) => void) {
    this.listeners.get(eventType)?.delete(handler);
  }

  // ── 高级 API ──
  async createTask(goal: string): Promise<ProtocolTask> {
    const result = (await this.call("task.create", { goal })) as RpcResult<ProtocolTask>;
    return result.task!;
  }

  async listTasks(status?: string): Promise<ProtocolTask[]> {
    const params = status ? { status } : {};
    const result = (await this.call("task.list", params)) as RpcResult<ProtocolTask>;
    return result.tasks || [];
  }

  async getTask(taskId: string): Promise<ProtocolTask> {
    const result = (await this.call("task.status", { task_id: taskId })) as RpcResult<ProtocolTask>;
    return result.task!;
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.call("task.cancel", { task_id: taskId });
  }

  async pauseTask(taskId: string): Promise<void> {
    await this.call("task.pause", { task_id: taskId });
  }

  async resumeTask(taskId: string): Promise<void> {
    await this.call("task.resume", { task_id: taskId });
  }

  async getLogs(taskId: string, limit = 50): Promise<AuditEvent[]> {
    const result = (await this.call("task.logs", {
      task_id: taskId,
      limit,
    })) as RpcResult;
    return result.audit_logs || [];
  }

  async replayTask(runId: string): Promise<BusEvent[]> {
    const result = (await this.call("task.replay", {
      run_id: runId,
    })) as RpcResult;
    return result.events || [];
  }

  async getWorldState(): Promise<Record<string, unknown>> {
    const result = (await this.call("world.snapshot", {})) as RpcResult;
    return result.world_state || {};
  }

  async getDaemonStatus(): Promise<RpcResult> {
    return (await this.call("daemon.status", {})) as RpcResult;
  }

  async respondApproval(
    approvalId: string,
    action: "approve" | "reject",
    reason?: string
  ): Promise<void> {
    await this.call("approval.respond", {
      approval_id: approvalId,
      action,
      reason: reason || "",
    });
  }

  // ── Provider RPC ──
  async listProviders(): Promise<LLMProvider[]> {
    const result = (await this.call("provider.list", {})) as any;
    return result.providers || [];
  }

  async createProvider(data: Partial<LLMProvider>): Promise<LLMProvider> {
    const result = (await this.call("provider.create", { provider: data })) as any;
    return result.provider!;
  }

  async updateProvider(id: string, data: Partial<LLMProvider>): Promise<LLMProvider> {
    const result = (await this.call("provider.update", { id, provider: data })) as any;
    return result.provider!;
  }

  async deleteProvider(id: string): Promise<void> {
    await this.call("provider.delete", { id });
  }

  async testProvider(id: string): Promise<{ ok: boolean; message: string; latency_ms: number }> {
    const result = (await this.call("provider.test", { id })) as any;
    return result;
  }

  // ── Agent Config RPC ──
  async listAgentConfigs(): Promise<any[]> {
    const result = (await this.call("agent_config.list", {})) as any;
    return result.configs || [];
  }

  async createAgentConfig(data: any): Promise<any> {
    const result = (await this.call("agent_config.create", { config: data })) as any;
    return result.config!;
  }

  async updateAgentConfig(id: string, data: any): Promise<any> {
    const result = (await this.call("agent_config.update", { id, config: data })) as any;
    return result.config!;
  }

  async deleteAgentConfig(id: string): Promise<void> {
    await this.call("agent_config.delete", { id });
  }

  async getAgentConfig(id: string): Promise<any> {
    const result = (await this.call("agent_config.get", { id })) as any;
    return result.config!;
  }

  async answerHumanQuestion(
    taskId: string,
    questionId: string,
    answer: string
  ): Promise<void> {
    await this.call("human.answer", {
      task_id: taskId,
      question_id: questionId,
      answer,
    });
  }
}

export const rpc = new RpcClient();
export default rpc;
