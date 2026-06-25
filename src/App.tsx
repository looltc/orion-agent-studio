import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/theme/ThemeContext";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import AgentWorkspacePage from "@/pages/AgentWorkspacePage";
import AuditPage from "@/pages/AuditPage";
import SettingsPage from "@/pages/SettingsPage";
import ProvidersPage from "@/pages/ProvidersPage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agent/:agentId" element={<AgentWorkspacePage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
