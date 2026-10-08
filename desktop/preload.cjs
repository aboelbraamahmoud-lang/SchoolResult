const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('schoolResultDesktop', Object.freeze({
  isDesktop: true,
  getAppInfo: () => ipcRenderer.invoke('app:get-info')
}));
