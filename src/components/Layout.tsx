import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ConnectionBar from "./ConnectionBar";
import ErrorBoundary from "./ErrorBoundary";
import rpc from "@/client/rpc";

export default function Layout() {
  // 启动时自动连接 daemon
  useEffect(() => {
    rpc.connect().catch(() => {
      /* daemon 不可用时静默，ConnectionBar 会显示状态 */
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConnectionBar />
        <main className="flex-1 overflow-hidden bg-surface-50 dark:bg-surface-950">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
