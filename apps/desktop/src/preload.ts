import { contextBridge, ipcRenderer } from 'electron';

// Secure bridge exposing only explicitly whitelisted functions to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  printDocument: () => ipcRenderer.invoke('app:print'),
  selectDirectory: () => ipcRenderer.invoke('app:selectDirectory'),
  isDesktop: true,
});
