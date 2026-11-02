// 琉璃主题插件 · preload：给界面开主进程接口
// preload 每页可能跑两次，重复 expose 会报错，先查一下
const { contextBridge, ipcRenderer } = require("electron");

const api = {
    startWindowDrag: () => ipcRenderer.invoke('LiteLoader.liuli.dragStart'),
    moveWindowDrag: () => ipcRenderer.send('LiteLoader.liuli.dragMove'),
    stopWindowDrag: () => ipcRenderer.send('LiteLoader.liuli.dragStop'),
    openDevTools: async () => {
        try { return await ipcRenderer.invoke("LiteLoader.liuli.openDevTools"); }
        catch (error) {
            if (String(error?.message).includes('No handler registered')) {
                throw new Error("开发者工具主进程接口尚未载入，请点击“重新加载琉璃”更新接口，单独刷新页面不会生效。");
            }
            throw error;
        }
    },
    selfUid: () => ipcRenderer.invoke("LiteLoader.liuli.selfUid"),
    openExternal: url => ipcRenderer.invoke("LiteLoader.liuli.openExternal", url),
    // 诊断包（契约 installer/DIAG-COVERAGE.md 3.1）
    diagExport: payload => ipcRenderer.invoke("LiteLoader.liuli.diagExport", payload),
    diagLog: entry => ipcRenderer.send("LiteLoader.liuli.diagLog", entry),
    diagOpenPath: path => ipcRenderer.invoke("LiteLoader.liuli.diagOpenPath", path),
};

const exists = contextBridge.executeInMainWorld({ func: key => key in globalThis, args: ["liuli_api"] });
if (!exists) contextBridge.exposeInMainWorld("liuli_api", api);
