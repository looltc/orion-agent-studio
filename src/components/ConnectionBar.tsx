import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import rpc, { type ConnectionStatus } from "@/client/rpc";

export default function ConnectionBar() {
  const [status, setStatus] = useState<ConnectionStatus>(rpc.status);
  const [showConnected, setShowConnected] = useState(false);

  useEffect(() => {
    const unsub = rpc.onStatusChange((s) => {
      setStatus(s);
      if (s === "connected") {
        setShowConnected(true);
        // Show "Connected" for 2s before fading out
        setTimeout(() => setShowConnected(false), 2000);
      } else {
        setShowConnected(false);
      }
    });
    setStatus(rpc.status);
    return unsub;
  }, []);

  if (status === "connected" && !showConnected) return null;

  const config = {
    disconnected: {
      icon: WifiOff,
      text: "Daemon 未连接 — 正在尝试重新连接…",
      className:
        "bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300",
    },
    connecting: {
      icon: Loader2,
      text: "正在连接 Daemon…",
      className:
        "bg-amber-50 dark:bg-yellow-900/30 border-amber-200 dark:border-yellow-900/40 text-amber-700 dark:text-yellow-300",
    },
    connected: {
      icon: Wifi,
      text: "已连接",
      className:
        "bg-emerald-50 dark:bg-green-900/30 border-emerald-200 dark:border-green-900/40",
    },
  };

  const { icon: Icon, text, className } = config[status];

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs border-b transition-opacity duration-300 ${className} ${status === "connected" && showConnected ? "opacity-100" : "opacity-100"}`}
    >
      <Icon
        size={12}
        className={status === "connecting" ? "animate-spin" : ""}
      />
      <span>{text}</span>
    </div>
  );
}
