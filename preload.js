const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  invoke: (ch, ...args) => ipcRenderer.invoke(ch, ...args),
  on: (ch, fn) => ipcRenderer.on(ch, (_e, data) => fn(data)),
});
