import { watch, type FSWatcher } from 'fs'
import type { BrowserWindow } from 'electron'
import { getEdgeBookmarksFilePath } from './edgeBookmarks'

let watcher: FSWatcher | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function startEdgeBookmarksWatcher(getWindow: () => BrowserWindow | null): void {
  stopEdgeBookmarksWatcher()
  const filePath = getEdgeBookmarksFilePath()
  if (!filePath) return

  watcher = watch(filePath, { persistent: false }, () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const win = getWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('links:bookmarks-file-changed')
      }
    }, 400)
  })

  watcher.on('error', () => {
    stopEdgeBookmarksWatcher()
  })
}

export function stopEdgeBookmarksWatcher(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  watcher?.close()
  watcher = null
}
