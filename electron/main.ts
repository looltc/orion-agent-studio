import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "Orion Studio",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0d1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---- IPC handlers ----

// 审批响应：渲染进程 → 主进程 → 可转发到 WebSocket
ipcMain.handle("approval:respond", async (_event, data: {
  approvalId: string;
  action: "approve" | "reject";
  reason: string;
}) => {
  // 此处可通过 WebSocket 转发到 Daemon（或由渲染进程直连）
  return { ok: true };
});

// 截图请求
ipcMain.handle("desktop:screenshot", async () => {
  if (mainWindow) {
    const image = await mainWindow.webContents.capturePage();
    return image.toDataURL();
  }
  return null;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
