const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// 数据文件存在用户数据目录
function getStorePath() {
  return path.join(app.getPath("userData"), "store.json");
}
function readStore() {
  try { return JSON.parse(fs.readFileSync(getStorePath(), "utf-8")); }
  catch { return {}; }
}
function writeStore(data) {
  fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2), "utf-8");
}

const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 680,
    minWidth: 480,
    minHeight: 500,
    titleBarStyle: "hiddenInset",
    icon: path.join(__dirname, "public/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── 持久化存储 IPC 接口 ──
ipcMain.handle("storage-get", (_, key) => {
  const data = readStore();
  return data[key] ?? null;
});
ipcMain.handle("storage-set", (_, key, value) => {
  const data = readStore();
  data[key] = value;
  writeStore(data);
  return true;
});
ipcMain.handle("storage-delete", (_, key) => {
  const data = readStore();
  delete data[key];
  writeStore(data);
  return true;
});