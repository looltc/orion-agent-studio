import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  ShieldCheck,
  Settings,
  Menu,
  X,
  LogOut,
  Play,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Tasks" },
  { to: "/history", icon: History, label: "History" },
  { to: "/audit", icon: ShieldCheck, label: "Audit" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("orion_token");
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col bg-surface-950">
      {/* Top nav (mobile) */}
      <header className="lg:hidden h-12 flex items-center justify-between px-3 border-b border-surface-700 shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-300"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="text-sm font-semibold text-white">Orion Studio</span>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-400"
        >
          <LogOut size={18} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static z-40 w-56 h-[calc(100vh-3rem)] lg:h-full bg-surface-900 border-r border-surface-700 flex flex-col transition-transform shrink-0`}
        >
          <div className="h-12 hidden lg:flex items-center gap-2 px-4 border-b border-surface-700">
            <div className="w-6 h-6 rounded-lg bg-orion-600 flex items-center justify-center">
              <Play size={12} className="text-white" fill="white" />
            </div>
            <span className="font-semibold text-sm">Orion Studio</span>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
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

          {/* Logout (desktop) */}
          <div className="hidden lg:block px-4 py-3 border-t border-surface-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-surface-500 hover:text-red-400 transition-colors w-full"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
