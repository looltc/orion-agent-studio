import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";

let mainWindow: BrowserWindow | null = null;

// ── 数据目录 ──
const DATA_DIR = path.join(app.getPath("userData"), "data");
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Agent 持久化 ──
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");

function loadAgents(): unknown[] {
  ensureDataDir();
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      return JSON.parse(fs.readFileSync(AGENTS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load agents:", e);
  }
  return [];
}

function saveAgents(agents: unknown[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save agents:", e);
  }
}

// ── 窗口创建 ──
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

  // Dev: 连接 Vite dev server；Prod: 加载打包文件
  const isDev = process.argv.includes("--dev") || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// ── IPC Handlers ──
ipcMain.handle("agents:list", async () => {
  return loadAgents();
});

ipcMain.handle("agents:save", async (_event, agents: unknown[]) => {
  saveAgents(agents);
  return { ok: true };
});

ipcMain.handle("agents:load", async () => {
  return loadAgents();
});

ipcMain.handle("approval:respond", async () => {
  return { ok: true };
});

ipcMain.handle("desktop:screenshot", async () => {
  if (mainWindow) {
    const image = await mainWindow.webContents.capturePage();
    return image.toDataURL();
  }
  return null;
});

// ── App 生命周期 ──
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
