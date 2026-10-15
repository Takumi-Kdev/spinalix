const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('spinalix', {
  onQuickCapture: (cb) => {
    ipcRenderer.on('quick-capture', () => cb())
  },
  platform: process.platform,
})
