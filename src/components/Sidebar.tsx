import {
  LayoutDashboard,
  MessageCircle,
  History,
  ShieldCheck,
  Settings,
  Activity,
  Play,
  Server,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import ThemeToggle from "@/components/agent/ThemeToggle";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/history", icon: History, label: "History" },
  { to: "/audit", icon: ShieldCheck, label: "Audit" },
  { to: "/providers", icon: Server, label: "Providers" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside
      className="w-56 h-screen shrink-0 flex flex-col select-none
        bg-white dark:bg-surface-900
        border-r border-surface-200 dark:border-surface-700"
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center gap-3 px-4
          border-b border-surface-200 dark:border-surface-700"
      >
        <div className="w-7 h-7 rounded-lg bg-orion-600 flex items-center justify-center">
          <Play size={14} className="text-white" fill="white" />
        </div>
        <span className="font-semibold text-sm text-surface-900 dark:text-white tracking-wide">
          Orion Studio
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
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-orion-50 dark:bg-orion-600/20 text-orion-700 dark:text-orion-400 font-medium"
                  : "text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t border-surface-200 dark:border-surface-700
          flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-xs text-surface-500">
          <Activity size={14} className="text-emerald-500" />
          <span>Daemon :9877</span>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
