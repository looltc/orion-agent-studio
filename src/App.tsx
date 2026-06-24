import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/theme/ThemeContext";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import AgentWorkspacePage from "@/pages/AgentWorkspacePage";
import TasksPage from "@/pages/TasksPage";
import TaskDetailPage from "@/pages/TaskDetailPage";
import HistoryPage from "@/pages/HistoryPage";
import AuditPage from "@/pages/AuditPage";
import SettingsPage from "@/pages/SettingsPage";
import ProvidersPage from "@/pages/ProvidersPage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* V2: Agent-centric routes */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agent/:agentId" element={<AgentWorkspacePage />} />

            {/* V1 legacy routes (still accessible) */}
            <Route path="/chat" element={<TasksPage />} />
            <Route path="/task/:taskId" element={<TaskDetailPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
