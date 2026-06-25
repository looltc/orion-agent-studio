import {
  LayoutDashboard,
  ShieldCheck,
  Settings,
  Activity,
  Play,
  Server,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import ThemeToggle from "@/components/agent/ThemeToggle";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "仪表盘" },
  { to: "/audit", icon: ShieldCheck, label: "审计日志" },
  { to: "/providers", icon: Server, label: "LLM 提供者" },
  { to: "/settings", icon: Settings, label: "设置" },
];

export default function Sidebar() {
  return (
    <aside
      className="w-56 h-screen shrink-0 flex flex-col select-none
        bg-white dark:bg-surface-900
        border-r border-surface-200 dark:border-surface-800"
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center gap-3 px-4"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orion-400 to-orion-600
                    flex items-center justify-center shadow-lg shadow-orion-600/20">
          <Play size={18} className="text-white" fill="white" />
        </div>
        <span className="font-bold text-sm text-surface-900 dark:text-white tracking-tight">
          Orion
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-orion-50 dark:bg-orion-900/30 text-orion-700 dark:text-orion-400 font-semibold shadow-sm"
                  : "text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white"
              }`
            }
            aria-label={item.label}
          >
            <item.icon size={18} aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t border-surface-200 dark:border-surface-800"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Activity size={14} className="text-emerald-500" />
            <span>Daemon :9877</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
