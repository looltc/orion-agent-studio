import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider } from "../src/theme/ThemeContext";
import Layout from "./Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "../src/pages/DashboardPage";
import AgentWorkspacePage from "../src/pages/AgentWorkspacePage";
import AuditPage from "../src/pages/AuditPage";
import SettingsPage from "../src/pages/SettingsPage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("orion_token");
    setAuthed(!!token);
  }, []);

  if (authed === null) return null;
  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agent/:agentId" element={<AgentWorkspacePage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
