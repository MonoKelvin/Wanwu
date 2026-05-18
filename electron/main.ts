import { app, BrowserWindow, shell } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { registerIpcHandlers } from './ipc/handlers'
import { setMainWindow, broadcastMaximizedState } from './windowState'
import { DatabaseService } from './services/database'
import { LibraryService } from './services/libraryService'
import { RssService } from './services/rssService'
import { MediaService } from './services/mediaService'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

const services = {
  db: null as DatabaseService | null,
  library: null as LibraryService | null,
  rss: null as RssService | null,
  media: null as MediaService | null
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    frame: false,
    title: '万物',
    autoHideMenuBar: true,
    resizable: true,
    // Windows 无边框时保留边缘拖拽缩放
    thickFrame: process.platform === 'win32',
    webPreferences: {
      preload: (() => {
        const mjs = join(__dirname, '../preload/index.mjs')
        const js = join(__dirname, '../preload/index.js')
        return existsSync(mjs) ? mjs : js
      })(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    broadcastMaximizedState()
  })

  mainWindow.on('maximize', broadcastMaximizedState)
  mainWindow.on('unmaximize', broadcastMaximizedState)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function initServices(): Promise<void> {
  const userData = join(app.getPath('userData'), 'wanwu')
  services.db = new DatabaseService(userData)
  await services.db.init()
  services.library = new LibraryService(services.db)
  services.rss = new RssService(services.db)
  services.media = new MediaService(userData)
  registerIpcHandlers(services)
}

app.whenReady().then(async () => {
  await initServices()
  createWindow()
  void services.rss?.pruneUnhealthyDefaultFeeds().catch(() => {})

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  setMainWindow(null)
  services.db?.close()
  if (process.platform !== 'darwin') app.quit()
})
