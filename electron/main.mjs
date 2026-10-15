// Spinalix デスクトップアプリ（Electron）
// - メニューバーに常駐
// - どこからでも ⌥Space で「記憶する」
// - 記憶はユーザーデータ領域の brain.json に保存（外部送信なし）

import { app, BrowserWindow, Menu, Tray, globalShortcut, nativeImage, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { startServer } from '../server.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

let win = null
let tray = null
let serverInfo = null

async function boot() {
  const distDir = isDev ? join(__dirname, '..', 'dist') : join(__dirname, '..', 'dist')
  const dataDir = app.getPath('userData')
  serverInfo = await startServer({ distDir, dataDir, port: 5310, host: '0.0.0.0' })

  win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 420,
    title: 'Spinalix',
    backgroundColor: '#07090f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  })
  win.loadURL(`http://127.0.0.1:${serverInfo.port}`)
  win.on('closed', () => {
    win = null
  })

  const icon = nativeImage.createFromPath(join(__dirname, 'trayTemplate.png'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Spinalix — 記憶が、あなたに話しかける')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'ひらく', click: () => showWindow() },
      { label: '記憶する（⌥Space）', click: () => quickCapture() },
      { type: 'separator' },
      { label: `スマホから: ${serverInfo.lan}`, click: () => shell.openExternal(serverInfo.lan) },
      { type: 'separator' },
      { label: '終了', click: () => app.quit() },
    ]),
  )
  tray.on('click', () => showWindow())

  globalShortcut.register('Alt+Space', () => quickCapture())
}

function showWindow() {
  if (!win) {
    win = new BrowserWindow({
      width: 1240,
      height: 840,
      title: 'Spinalix',
      backgroundColor: '#07090f',
      webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true },
    })
    win.loadURL(`http://127.0.0.1:${serverInfo.port}`)
    win.on('closed', () => {
      win = null
    })
  }
  win.show()
  win.focus()
}

function quickCapture() {
  showWindow()
  win?.webContents.send('quick-capture')
}

app.whenReady().then(boot)

app.on('window-all-closed', () => {
  // メニューバー常駐を続ける（明示的に終了するまで）
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
