const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('schoolResultDesktop', Object.freeze({
  isDesktop: true,
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  listPrinters: () => ipcRenderer.invoke('app:list-printers'),
  printCurrent: options => ipcRenderer.invoke('app:print-current', options),
  printPopup: options => ipcRenderer.invoke('app:print-popup', options),
  savePopupPDF: options => ipcRenderer.invoke('app:save-popup-pdf', options),
  savePDF: options => ipcRenderer.invoke('app:save-pdf', options)
}));
