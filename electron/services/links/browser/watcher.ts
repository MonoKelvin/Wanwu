import { watch, type FSWatcher } from 'fs'
import type { BrowserWindow } from 'electron'
import { listBrowserBookmarkProviders } from './registry'

type WatchedEntry = {
  providerId: string
  path: string
  watcher: FSWatcher
}

let entries: WatchedEntry[] = []
let debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function startBrowserBookmarksWatchers(getWindow: () => BrowserWindow | null): void {
  stopBrowserBookmarksWatchers()

  for (const provider of listBrowserBookmarkProviders()) {
    const filePath = provider.resolveBookmarksPath()
    if (!filePath) continue

    const watcher = watch(filePath, { persistent: false }, () => {
      const prev = debounceTimers.get(provider.id)
      if (prev) clearTimeout(prev)
      debounceTimers.set(
        provider.id,
        setTimeout(() => {
          debounceTimers.delete(provider.id)
          const win = getWindow()
          if (win && !win.isDestroyed()) {
            win.webContents.send('links:bookmarks-file-changed', {
              browserSourceId: provider.id
            })
          }
        }, 400)
      )
    })

    watcher.on('error', () => {
      stopBrowserBookmarksWatchers()
    })

    entries.push({ providerId: provider.id, path: filePath, watcher })
  }
}

export function stopBrowserBookmarksWatchers(): void {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer)
  }
  debounceTimers.clear()
  for (const entry of entries) {
    entry.watcher.close()
  }
  entries = []
}
