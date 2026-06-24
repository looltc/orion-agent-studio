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

  useEffect(() => {
    checkConnection();
    const unsub = rpc.onStatusChange((s) => {
      setConnectionStatus(s);
      if (s === "connected") checkInfo();
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
    rpc.reconfigure(daemonHost, parseInt(daemonPort, 10) || 9877);
    try {
      await rpc.connect();
      await checkInfo();
    } catch {
      // 状态通过 onStatusChange 更新
    } finally {
      setReconnecting(false);
    }
  };

  const statusConfig = {
    connected: { label: "Online", className: "bg-green-900/30 text-green-400", dot: "bg-green-400" },
    connecting: { label: "Connecting…", className: "bg-yellow-900/30 text-yellow-400", dot: "bg-yellow-400 animate-pulse" },
    disconnected: { label: "Offline", className: "bg-red-900/30 text-red-400", dot: "bg-red-400" },
  };
  const sc = statusConfig[connectionStatus];

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      {/* Connection */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-surface-400 mb-4 flex items-center gap-2">
          <Plug size={16} /> Connection
        </h2>
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Runtime Daemon</p>
              <p className="text-xs text-surface-500">
                {connectionStatus === "connected"
                  ? `Connected to ${daemonHost}:${daemonPort}`
                  : "Not connected"}
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
              <label className="text-xs text-surface-500">Host</label>
              <input
                type="text"
                value={daemonHost}
                onChange={(e) => setDaemonHost(e.target.value)}
                className="mt-1 w-full bg-surface-950 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orion-600/50"
              />
            </div>
            <div>
              <label className="text-xs text-surface-500">Port</label>
              <input
                type="text"
                value={daemonPort}
                onChange={(e) => setDaemonPort(e.target.value)}
                className="mt-1 w-full bg-surface-950 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orion-600/50"
              />
            </div>
          </div>

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
            {reconnecting ? "Connecting…" : "Reconnect"}
          </button>
        </div>
      </section>

      {/* Daemon Info */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-surface-400 mb-4 flex items-center gap-2">
          <Globe size={16} /> Daemon Info
        </h2>
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
          {Object.keys(daemonInfo).length > 0 ? (
            <pre className="text-xs text-surface-400 font-mono whitespace-pre-wrap">
              {JSON.stringify(daemonInfo, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-surface-600">
              {connectionStatus === "connected"
                ? "No daemon info available."
                : "Connect to a daemon to view its status."}
            </p>
          )}
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-sm font-medium text-surface-400 mb-4">About</h2>
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orion-600 flex items-center justify-center">
              <Save size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Orion Studio</p>
              <p className="text-xs text-surface-500">
                v0.1.0 — Phase 2 Desktop Client
              </p>
            </div>
          </div>
          <p className="text-xs text-surface-600 mt-3">
            Built with Electron + React + TypeScript. Connects to Orion Agent
            Runtime Daemon via JSON-RPC WebSocket protocol.
          </p>
        </div>
      </section>
    </div>
  );
}
