import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ConnectionBar from "./ConnectionBar";
import ErrorBoundary from "./ErrorBoundary";

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConnectionBar />
        <main className="flex-1 overflow-auto bg-surface-50 dark:bg-surface-950">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
