import { app, BrowserWindow, nativeImage, protocol, shell } from 'electron'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { extname, join } from 'path'
import { resolveWanwuMediaAbsolute } from './services/wanwuMedia'
import { resolveAppLogoPath } from './services/appAssets'
import { registerIpcHandlers } from './ipc/handlers'
import { setMainWindow, broadcastMaximizedState } from './windowState'
import {
  attachWindowStatePersistence,
  applyStartupWindowState,
  DEFAULT_WINDOW_SIZE,
  getInitialWindowBounds,
  readWindowStateModeFromSettings
} from './services/windowPersistence'
import { DatabaseService } from './services/database'
import { LibraryService } from './services/libraryService'
import { RssService } from './services/rssService'
import { MediaService } from './services/mediaService'
import { resolveWanwuPath } from './services/dataPaths'
import { applyRssAutoRefreshSchedule } from './services/rssScheduler'
import { runStartupLibrarySeed } from './services/librarySeed'

const isDev = !app.isPackaged

/** Windows：缓解 Chromium 网络子进程异常；保留 GPU 以支持 backdrop-filter 毛玻璃 */
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('enable-features', 'NetworkServiceInProcess')
  app.commandLine.appendSwitch(
    'disable-features',
    'NetworkServiceSandbox,SpareRendererForSitePerProcess,Win11OverlayScrollbars'
  )
  app.commandLine.appendSwitch('disable-gpu-sandbox')
}

const MEDIA_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8'
}

function mediaMimeType(filePath: string): string {
  return MEDIA_MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'wanwu-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true
    }
  }
])

let mainWindow: BrowserWindow | null = null

const services = {
  db: null as DatabaseService | null,
  library: null as LibraryService | null,
  rss: null as RssService | null,
  media: null as MediaService | null
}

async function loadDevRenderer(win: BrowserWindow, urls: string[]): Promise<void> {
  const maxAttempts = 30
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const url = urls[attempt % urls.length]!
    try {
      await win.loadURL(url)
      return
    } catch (err) {
      console.warn(`[wanwu] dev load retry ${attempt + 1}/${maxAttempts}`, url, err)
      await new Promise((r) => setTimeout(r, 800))
    }
  }
  const fallback = join(__dirname, '../renderer/index.html')
  if (existsSync(fallback)) {
    console.warn('[wanwu] dev http failed, fallback to built renderer:', fallback)
    await win.loadFile(fallback)
    return
  }
  throw new Error('dev renderer failed after retries')
}

function createWindow(): void {
  const appIcon = resolveAppLogoPath(256)
  const basePath = services.db?.getBasePath() ?? resolveWanwuPath()
  const windowStateMode = readWindowStateModeFromSettings(() => services.db?.getAppSettings())
  const initialBounds = getInitialWindowBounds(windowStateMode, basePath)

  mainWindow = new BrowserWindow({
    width: initialBounds.width,
    height: initialBounds.height,
    x: initialBounds.x,
    y: initialBounds.y,
    minWidth: DEFAULT_WINDOW_SIZE.minWidth,
    minHeight: DEFAULT_WINDOW_SIZE.minHeight,
    show: false,
    frame: false,
    title: '万物',
    ...(appIcon ? { icon: appIcon } : {}),
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

  attachWindowStatePersistence(mainWindow, {
    getBasePath: () => services.db?.getBasePath() ?? resolveWanwuPath(),
    getMode: () =>
      readWindowStateModeFromSettings(() => services.db?.getAppSettings())
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) applyStartupWindowState(mainWindow, windowStateMode, basePath)
    mainWindow?.show()
    broadcastMaximizedState()
  })

  mainWindow.on('maximize', broadcastMaximizedState)
  mainWindow.on('unmaximize', broadcastMaximizedState)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, url) => {
    console.error('[wanwu] did-fail-load', errorCode, errorDescription, url)
    mainWindow?.show()
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    const devBase = process.env['ELECTRON_RENDERER_URL'].replace(/\/$/, '')
    const devUrls = [`${devBase}/`, devBase.replace('localhost', '127.0.0.1')]
    // 优先 Vite 热更新；仅当 HTTP 重试失败时回退到 out/renderer（见 loadDevRenderer）
    void loadDevRenderer(mainWindow, devUrls).catch((err) => {
      console.error('[wanwu] load dev renderer failed', err)
      mainWindow?.show()
    })
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch((err) => {
      console.error('[wanwu] load renderer failed', err)
      mainWindow?.show()
    })
  }

  // 若 ready-to-show 未触发，避免窗口一直不出现
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('[wanwu] forcing window show after timeout')
      mainWindow.show()
    }
  }, 12000)
}

async function initServices(): Promise<void> {
  const userData = resolveWanwuPath()
  services.db = new DatabaseService(userData)
  await services.db.init({ skipLibrarySeed: true })
  services.library = new LibraryService(services.db)
  services.rss = new RssService(services.db)
  services.media = new MediaService(userData)
  registerIpcHandlers(services)
  applyRssAutoRefreshSchedule(services)
}

app.whenReady().then(async () => {
  protocol.handle('wanwu-media', async (request) => {
    const raw = decodeURIComponent(request.url.replace(/^wanwu-media:\/\//i, '')).split(/[?#]/)[0]
    const abs = resolveWanwuMediaAbsolute(raw)
    if (!abs) {
      return new Response('Not Found', { status: 404 })
    }
    try {
      const body = await readFile(abs)
      return new Response(body, {
        headers: {
          'Content-Type': mediaMimeType(abs),
          'Cache-Control': 'private, max-age=3600'
        }
      })
    } catch (err) {
      console.error('[wanwu] wanwu-media read failed', abs, err)
      return new Response('Not Found', { status: 404 })
    }
  })

  try {
    await initServices()
  } catch (err) {
    console.error('[wanwu] initServices failed', err)
    throw err
  }

  const appIcon = resolveAppLogoPath(256)
  if (appIcon && process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(appIcon))
  }

  createWindow()

  if (services.db) {
    setImmediate(() => runStartupLibrarySeed(services.db!))
  }

  void services.rss?.pruneUnhealthyDefaultFeeds().catch(() => {})

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((err) => {
  console.error('[wanwu] startup failed', err)
  app.exit(1)
})

app.on('window-all-closed', () => {
  setMainWindow(null)
  services.db?.close()
  if (process.platform !== 'darwin') app.quit()
})
