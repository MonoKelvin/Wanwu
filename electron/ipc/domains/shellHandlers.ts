import { ipcMain } from 'electron'
import {
  cacheImageForViewer,
  copyImageToClipboard,
  copyTextToClipboard,
  downloadMediaFile,
  openExternalUrl,
  pickImageFile,
  pickSavePath,
  releaseViewerImageCache,
  saveImageDataUrl,
  saveClipboardImageDataUrlToTemp,
  saveTextFile,
  savePngDataUrl,
  showMediaInFolder
} from '../../services/media/shell'
import type { AppServices } from '../types'

export function registerShellHandlers(services: AppServices): void {
  ipcMain.handle('shell:openExternal', (_e, url: string) => openExternalUrl(url))
  ipcMain.handle(
    'shell:downloadFile',
    (_e, params: { url: string; defaultName?: string }) => downloadMediaFile(params.url, params.defaultName)
  )
  ipcMain.handle('shell:showItemInFolder', (_e, url: string) => showMediaInFolder(url))
  ipcMain.handle('shell:copyText', (_e, text: string) => {
    copyTextToClipboard(text)
  })
  ipcMain.handle('shell:copyImage', (_e, url: string) => copyImageToClipboard(url))
  ipcMain.handle('shell:pickImageFile', () => pickImageFile())
  ipcMain.handle(
    'shell:pickSavePath',
    (_e, params: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
      pickSavePath(params)
  )
  ipcMain.handle(
    'shell:savePngDataUrl',
    (_e, params: { dataUrl: string; defaultName?: string }) =>
      savePngDataUrl(params.dataUrl, params.defaultName)
  )
  ipcMain.handle(
    'shell:saveImageDataUrl',
    (_e, params: { dataUrl: string; defaultName?: string }) =>
      saveImageDataUrl(params.dataUrl, params.defaultName)
  )
  ipcMain.handle(
    'shell:saveClipboardImageDataUrlToTemp',
    (_e, params: { dataUrl: string }) => saveClipboardImageDataUrlToTemp(params.dataUrl)
  )
  ipcMain.handle(
    'shell:saveTextFile',
    (_e, params: { content: string; defaultName?: string; extension?: string }) =>
      saveTextFile(params.content, params.defaultName, params.extension)
  )
  ipcMain.handle('shell:cacheImageForViewer', (_e, url: string) => cacheImageForViewer(url))
  ipcMain.handle('shell:releaseViewerImageCache', (_e, cacheId: number) => {
    releaseViewerImageCache(cacheId)
  })
}
