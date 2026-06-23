import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import TasksPage from "@/pages/TasksPage";
import TaskDetailPage from "@/pages/TaskDetailPage";
import HistoryPage from "@/pages/HistoryPage";
import AuditPage from "@/pages/AuditPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TasksPage />} />
          <Route path="/task/:taskId" element={<TaskDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
