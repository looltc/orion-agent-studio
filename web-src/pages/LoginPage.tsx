import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Key, LogIn, Server } from "lucide-react";
import rpc from "../../src/client/rpc";

export default function LoginPage() {
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("9877");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const navigate = useNavigate();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setConnecting(true);

    try {
      // 连接 Daemon
      await rpc.connect();
      const status = await rpc.getDaemonStatus();

      // 简单 token 校验（生产环境应从 Daemon 验证）
      const savedToken = token.trim() || "orion-demo-token";
      localStorage.setItem("orion_token", savedToken);
      localStorage.setItem("orion_host", host);
      localStorage.setItem("orion_port", port);

      navigate("/");
    } catch (err) {
      setError(
        `Cannot connect to daemon at ${host}:${port}. Is 'orion serve' running?`
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-orion-600 flex items-center justify-center mx-auto mb-3">
            <Key size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">Orion Studio</h1>
          <p className="text-sm text-surface-500 mt-1">
            Connect to your Agent Runtime
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-surface-500 mb-1 block">Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orion-600/50"
                placeholder="127.0.0.1"
              />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Port</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orion-600/50"
                placeholder="9877"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-surface-500 mb-1 block">
              Access Token (optional for demo)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orion-600/50"
              placeholder="Enter token or leave blank"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-900/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-orion-600 hover:bg-orion-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {connecting ? (
              <>
                <Server size={16} className="animate-pulse" />
                Connecting...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Connect
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-surface-600 mt-6">
          Make sure <code className="text-surface-500">orion serve</code> is
          running on the target host.
        </p>
      </div>
    </div>
  );
}
