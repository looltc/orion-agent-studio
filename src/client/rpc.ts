// JSON-RPC 客户端 —— 连接 Runtime Daemon
// 支持 TCP socket（调试/本地）和 WebSocket（生产）

import type {
  ProtocolTask,
  ApprovalRequest,
  AuditEvent,
  BusEvent,
  RpcResult,
} from "@/types/protocol";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 9877; // WebSocket 端口（Daemon ws_port）

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
  private pending = new Map<number, {
    resolve: (v: unknown) => void;
    reject: (e: Error) => void;
  }>();
  // 事件监听器
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  constructor(host: string = DEFAULT_HOST, port: number = DEFAULT_PORT) {
    this.host = host;
    this.port = port;
  }

  // ---- WebSocket 连接 ----
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${this.host}:${this.port}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("RPC connected to", wsUrl);
        resolve();
      };

      this.ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.jsonrpc === "2.0" && data.id !== undefined) {
            // RPC response
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
            // 事件推送
            const handlers = this.listeners.get(data.type);
            if (handlers) {
              handlers.forEach((h) => h(data));
            }
            // 通配符
            const wildcard = this.listeners.get("*");
            if (wildcard) {
              wildcard.forEach((h) => h(data));
            }
          }
        } catch (e) {
          console.warn("RPC parse error:", e);
        }
      };

      this.ws.onerror = (err) => {
        console.error("RPC WebSocket error:", err);
        reject(new Error("WebSocket connection failed"));
      };

      this.ws.onclose = () => {
        console.log("RPC disconnected");
        this.ws = null;
      };

      // 超时
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error("Connection timeout"));
        }
      }, 5000);
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.pending.clear();
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ---- TCP 回退（Node.js 环境，如 Electron 主进程） ----
  async callTcp(method: string, params?: Record<string, unknown>): Promise<unknown> {
    // 浏览器环境不支持原始 TCP，统一走 WebSocket
    return this.call(method, params);
  }

  // ---- WebSocket RPC ----
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

      // 超时 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`RPC timeout: ${method}`));
        }
      }, 30000);
    });
  }

  // ---- 事件订阅 ----
  on(eventType: string, handler: (data: unknown) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: (data: unknown) => void) {
    this.listeners.get(eventType)?.delete(handler);
  }

  // ---- 高级 API ----
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
}

// 全局单例
export const rpc = new RpcClient();
export default rpc;
