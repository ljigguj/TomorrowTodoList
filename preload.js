const { contextBridge, ipcRenderer } = require("electron");

// 将 storage API 暴露给渲染进程（与 claude.ai 的 window.storage 接口保持一致）
contextBridge.exposeInMainWorld("storage", {
  get: (key) => ipcRenderer.invoke("storage-get", key).then(v => v ? { value: v } : null),
  set: (key, value) => ipcRenderer.invoke("storage-set", key, value).then(() => ({ key, value })),
  delete: (key) => ipcRenderer.invoke("storage-delete", key).then(() => ({ key, deleted: true })),
});