import { useState, useEffect } from "react";
import { Plug, Server, Globe, Save, RefreshCw } from "lucide-react";
import rpc, { type ConnectionStatus } from "@/client/rpc";

export default function SettingsPage() {
  const [daemonHost, setDaemonHost] = useState("127.0.0.1");
  const [daemonPort, setDaemonPort] = useState("9877");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [daemonInfo, setDaemonInfo] = useState<Record<string, unknown>>({});
  const [reconnecting, setReconnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
    const unsub = rpc.onStatusChange((s) => {
      setConnectionStatus(s);
      if (s === "connected") {
        checkInfo();
        setConnectError(null);
      }
      if (s === "disconnected") setDaemonInfo({});
    });
    return unsub;
  }, []);

  const checkConnection = async () => {
    setConnectionStatus(rpc.status);
    if (rpc.connected) {
      setConnectionStatus("connected");
      checkInfo();
    }
  };

  const checkInfo = async () => {
    try {
      const status = await rpc.getDaemonStatus();
      setDaemonInfo(status as Record<string, unknown>);
    } catch {
      setDaemonInfo({});
    }
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    setConnectError(null);
    rpc.reconfigure(daemonHost, parseInt(daemonPort, 10) || 9877);
    try {
      await rpc.connect();
      await checkInfo();
    } catch (e: any) {
      setConnectError(e?.message || "连接失败，请确认 Daemon 正在运行");
    } finally {
      setReconnecting(false);
    }
  };

  const statusConfig = {
    connected: { label: "在线", className: "bg-green-900/30 text-green-400", dot: "bg-green-400" },
    connecting: { label: "连接中…", className: "bg-yellow-900/30 text-yellow-400", dot: "bg-yellow-400 animate-pulse" },
    disconnected: { label: "离线", className: "bg-red-900/30 text-red-400", dot: "bg-red-400" },
  };
  const sc = statusConfig[connectionStatus];

  return (
    <div className="h-full flex flex-col">
      {/* Header（固定不滚动） */}
      <div className="shrink-0 px-6 pt-6 pb-4 max-w-2xl w-full mx-auto">
        <h1 className="text-xl font-semibold text-white">设置</h1>
      </div>

      {/* 内容区（独立滚动） */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 max-w-2xl w-full mx-auto">
      {/* Connection */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-surface-400 mb-4 flex items-center gap-2">
          <Plug size={16} /> 连接
        </h2>
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Runtime Daemon</p>
              <p className="text-xs text-surface-500">
                {connectionStatus === "connected"
                  ? `已连接到 ${daemonHost}:${daemonPort}`
                  : "未连接"}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.className}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="daemon-host" className="text-xs text-surface-500">主机地址（Host）</label>
              <input
                id="daemon-host"
                type="text"
                value={daemonHost}
                onChange={(e) => setDaemonHost(e.target.value)}
                className="mt-1 w-full bg-surface-950 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orion-600/50"
              />
            </div>
            <div>
              <label htmlFor="daemon-port" className="text-xs text-surface-500">端口（Port）</label>
              <input
                id="daemon-port"
                type="text"
                value={daemonPort}
                onChange={(e) => setDaemonPort(e.target.value)}
                className="mt-1 w-full bg-surface-950 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orion-600/50"
              />
            </div>
          </div>

          {connectError && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/50 text-red-400 text-xs">
              {connectError}
            </div>
          )}

          <button
            onClick={handleReconnect}
            disabled={reconnecting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {reconnecting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Server size={14} />
            )}
            {reconnecting ? "连接中…" : "重新连接"}
          </button>
        </div>
      </section>

      {/* Daemon Info */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-surface-400 mb-4 flex items-center gap-2">
          <Globe size={16} /> Daemon 信息
        </h2>
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
          {Object.keys(daemonInfo).length > 0 ? (
            <pre className="text-xs text-surface-400 font-mono whitespace-pre-wrap">
              {JSON.stringify(daemonInfo, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-surface-600">
              {connectionStatus === "connected"
                ? "暂无 Daemon 信息。"
                : "连接到 Daemon 后可查看其状态。"}
            </p>
          )}
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-sm font-medium text-surface-400 mb-4">关于</h2>
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orion-600 flex items-center justify-center">
              <Save size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Orion Studio</p>
              <p className="text-xs text-surface-500">
                v0.1.0 — 第二阶段桌面客户端
              </p>
            </div>
          </div>
          <p className="text-xs text-surface-600 mt-3">
            基于 Electron + React + TypeScript 构建，通过 JSON-RPC WebSocket
            协议连接 Orion Agent Runtime Daemon。
          </p>
        </div>
      </section>
      </div>
      {/* 内容区结束 */}
    </div>
  );
}
