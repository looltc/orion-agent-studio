import {
  LayoutDashboard,
  History,
  ShieldCheck,
  Settings,
  Activity,
  Play,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Tasks" },
  { to: "/history", icon: History, label: "History" },
  { to: "/audit", icon: ShieldCheck, label: "Audit" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-surface-900 border-r border-surface-700 flex flex-col select-none">
      {/* Logo */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-surface-700">
        <div className="w-7 h-7 rounded-lg bg-orion-600 flex items-center justify-center">
          <Play size={14} className="text-white" fill="white" />
        </div>
        <span className="font-semibold text-sm tracking-wide">Orion Studio</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-orion-600/20 text-orion-400 font-medium"
                  : "text-surface-300 hover:bg-surface-800 hover:text-white"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Status */}
      <StatusFooter />
    </aside>
  );
}

function StatusFooter() {
  return (
    <div className="px-4 py-3 border-t border-surface-700 flex items-center gap-2 text-xs text-surface-500">
      <Activity size={14} className="text-green-500" />
      <span>Daemon: 127.0.0.1:9876</span>
    </div>
  );
}
