import './bootstrap/quietDotenv'
import { app, BrowserWindow, nativeImage, protocol, shell } from 'electron'
import { existsSync, statSync } from 'fs'
import { createReadStream } from 'fs'
import { extname, join } from 'path'
import { Readable } from 'stream'
import { resolveWanwuMediaAbsoluteAsync } from './services/media/wanwu'
import { resolveAppLogoPath } from './services/media/appAssets'
import { registerIpcHandlers } from './ipc/handlers'
import { setMainWindow, broadcastMaximizedState } from './windowState'
import {
  attachWindowStatePersistence,
  applyStartupWindowState,
  DEFAULT_WINDOW_SIZE,
  getInitialWindowBounds,
  readWindowStateModeFromSettings
} from './services/app/window'
import { DatabaseService } from './services/core/database'
import { LibraryService } from './services/library/service'
import { LinksService } from './services/links/service'
import { DiagramService } from './services/diagrams/service'
import { RssService } from './services/rss/service'
import { MusicService } from './services/music/service'
import { MediaService } from './services/media/service'
import { NotesService } from './services/notes/service'
import {
  attachMainWindowNotePopoutCleanup,
  closeAllNotePopoutsForAppExit,
  configureNotePopoutPersistence,
  registerNotePopoutAppLifecycle
} from './services/notes/noteWindowManager'
import { SqliteNotesStorage } from './services/notes/storage'
import { SqliteUserDataGateway, type UserDataGateway } from './services/storage/userDataGateway'
import { resolveWanwuPath } from './services/data/paths'
import { applyRssAutoRefreshSchedule } from './services/rss/scheduler'
import { runStartupLibrarySeed } from './services/library/seed'
import { startLibraryBootstrap } from './services/library/pack'
import { runInstallerLibraryPackImport } from './services/library/installerImport'
// import { CloudAbodeService } from './services/cloud-abode/service'
import {
  disposeQuickAccess,
  focusMainWindow,
  isAppQuitting
} from './services/quickAccess/quickAccessManager'
import { attachMainWindowCloseBehavior, shouldKeepAppRunningAfterWindowClose } from './services/app/windowClose'
import { shutdownDataServices } from './services/data/shutdown'

const isDev = !app.isPackaged
const INSTALLER_IMPORT_FLAG = '--installer-import-library-pack'

function parseInstallerImportArgs(): { dataPath: string; zipPath?: string } | null {
  const idx = process.argv.indexOf(INSTALLER_IMPORT_FLAG)
  if (idx < 0) return null
  const dataPath = process.argv[idx + 1]?.trim()
  if (!dataPath) return null
  const zipPath = process.argv[idx + 2]?.trim()
  return { dataPath, zipPath: zipPath || undefined }
}

const installerImportRequest = parseInstallerImportArgs()

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
  '.hdr': 'image/vnd.radiance',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
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
  links: null as LinksService | null,
  diagrams: null as DiagramService | null,
  rss: null as RssService | null,
  music: null as MusicService | null,
  media: null as MediaService | null,
  notes: null as NotesService | null,
  userData: null as UserDataGateway | null,
  cloudAbode: null
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
  attachMainWindowCloseBehavior(mainWindow)
  attachMainWindowNotePopoutCleanup(mainWindow)

  attachWindowStatePersistence(mainWindow, {
    getBasePath: () => services.db?.getBasePath() ?? resolveWanwuPath(),
    getMode: () =>
      readWindowStateModeFromSettings(() => services.db?.getAppSettings())
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) applyStartupWindowState(mainWindow, windowStateMode, basePath)
    if (mainWindow?.isMinimized()) mainWindow.restore()
    mainWindow?.show()
    mainWindow?.focus()
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
  services.links = new LinksService(userData)
  services.diagrams = new DiagramService(userData)
  void services.diagrams.migrateStorageToWfg().catch((err) => {
    console.error('[wanwu:diagrams] 启动迁移失败', err)
  })
  services.rss = new RssService(services.db)
  services.music = new MusicService(services.db, userData)
  services.media = new MediaService(userData)
  services.userData = new SqliteUserDataGateway(services.db)
  services.notes = new NotesService(new SqliteNotesStorage(services.userData, userData))
  // 云斋暂下线（GLSL / 展厅 3D 未就绪）
  // services.cloudAbode = new CloudAbodeService()
  // services.cloudAbode.open(userData)
  configureNotePopoutPersistence(userData)
  registerIpcHandlers(services)
  applyRssAutoRefreshSchedule(services)
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    focusMainWindow()
  })
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return

  if (installerImportRequest) {
    try {
      const result = await runInstallerLibraryPackImport(
        installerImportRequest.dataPath,
        installerImportRequest.zipPath
      )
      if (result.status === 'failed') {
        console.error('[wanwu] installer import failed:', result.message)
        app.exit(1)
        return
      }
      console.log('[wanwu] installer import:', result.message)
      app.exit(0)
      return
    } catch (err) {
      console.error('[wanwu] installer import error', err)
      app.exit(1)
      return
    }
  }

  protocol.handle('wanwu-media', async (request) => {
    const raw = decodeURIComponent(request.url.replace(/^wanwu-media:\/\//i, '')).split(/[?#]/)[0]
    const abs = await resolveWanwuMediaAbsoluteAsync(raw)
    if (!abs) {
      return new Response('Not Found', { status: 404 })
    }
    try {
      const stat = statSync(abs)
      if (!stat.isFile()) {
        return new Response('Not Found', { status: 404 })
      }
      const headers: Record<string, string> = {
        'Content-Type': mediaMimeType(abs),
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(stat.size),
        'Access-Control-Allow-Origin': '*'
      }
      const stream = createReadStream(abs)
      const body = Readable.toWeb(stream) as ReadableStream<Uint8Array>
      return new Response(body, { headers })
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

  registerNotePopoutAppLifecycle()
  createWindow()
  focusMainWindow()

  if (services.db) {
    startLibraryBootstrap(services.db, () => runStartupLibrarySeed(services.db!))
  }

  void services.rss?.pruneUnhealthyDefaultFeeds().catch(() => {})

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((err) => {
  console.error('[wanwu] startup failed', err)
  app.exit(1)
})

app.on('before-quit', () => {
  disposeQuickAccess()
})

app.on('window-all-closed', () => {
  if (!isAppQuitting() && shouldKeepAppRunningAfterWindowClose()) {
    return
  }
  closeAllNotePopoutsForAppExit()
  setMainWindow(null)
  shutdownDataServices(services)
  if (process.platform !== 'darwin') {
    app.exit(0)
  }
})
