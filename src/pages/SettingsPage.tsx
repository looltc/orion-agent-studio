import { useState, useEffect } from "react";
import { Plug, Server, Globe, Save } from "lucide-react";
import rpc from "@/client/rpc";

export default function SettingsPage() {
  const [daemonHost, setDaemonHost] = useState("127.0.0.1");
  const [daemonPort, setDaemonPort] = useState("9876");
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [daemonInfo, setDaemonInfo] = useState<Record<string, unknown>>({});

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus("connecting");
    try {
      const status = await rpc.getDaemonStatus();
      setDaemonInfo(status);
      setConnectionStatus("connected");
    } catch {
      setConnectionStatus("disconnected");
      setDaemonInfo({});
    }
  };

  const handleReconnect = async () => {
    rpc.disconnect();
    // 更新连接地址（实际应在 rpc client 中支持）
    await checkConnection();
  };

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
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                connectionStatus === "connected"
                  ? "bg-green-900/30 text-green-400"
                  : "bg-red-900/30 text-red-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus === "connected" ? "bg-green-400" : "bg-red-400"
                }`}
              />
              {connectionStatus === "connected" ? "Online" : "Offline"}
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 text-sm font-medium transition-colors"
          >
            <Server size={14} />
            Reconnect
          </button>
        </div>
      </section>

      {/* Daemon Info */}
      {connectionStatus === "connected" && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-surface-400 mb-4 flex items-center gap-2">
            <Globe size={16} /> Daemon Info
          </h2>
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
            <pre className="text-xs text-surface-400 font-mono">
              {JSON.stringify(daemonInfo, null, 2)}
            </pre>
          </div>
        </section>
      )}

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
              <p className="text-xs text-surface-500">v0.1.0 — Phase 2 Desktop Client</p>
            </div>
          </div>
          <p className="text-xs text-surface-600 mt-3">
            Built with Electron + React + TypeScript. Connects to Orion Agent Runtime
            Daemon via JSON-RPC WebSocket protocol.
          </p>
        </div>
      </section>
    </div>
  );
}
