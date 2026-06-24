import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Agent CRUD
  loadAgents: () => ipcRenderer.invoke("agents:load"),
  saveAgents: (agents: unknown[]) => ipcRenderer.invoke("agents:save", agents),
  listAgents: () => ipcRenderer.invoke("agents:list"),

  // 审批
  respondApproval: (data: {
    approvalId: string;
    action: "approve" | "reject";
    reason: string;
  }) => ipcRenderer.invoke("approval:respond", data),

  // 截图
  takeScreenshot: () => ipcRenderer.invoke("desktop:screenshot"),

  // 平台信息
  platform: process.platform,
});
