import { ipcMain } from 'electron'
import { canNativeShare, openNativeShare, uploadTempShareFile, writeShareTempFile } from '../../services/media/share'
import type { AppServices } from '../types'

export function registerShareHandlers(services: AppServices): void {
  ipcMain.handle('share:canNativeShare', () => canNativeShare())
  ipcMain.handle(
    'share:nativeShare',
    (
      _e,
      params: {
        title?: string
        text?: string
        dataUrl?: string
        textContent?: string
        fileName: string
      }
    ) => {
      const file = writeShareTempFile({
        dataUrl: params.dataUrl,
        textContent: params.textContent,
        fileName: params.fileName
      })
      if (!file.ok) return file
      return openNativeShare({
        title: params.title,
        text: params.text,
        filePath: file.path
      }).finally(() => file.cleanup())
    }
  )
  ipcMain.handle(
    'share:uploadTemp',
    (
      _e,
      params: {
        dataUrl?: string
        textContent?: string
        fileName: string
        expire?: '1h' | '12h' | '24h' | '72h'
      }
    ) => {
      const file = writeShareTempFile({
        dataUrl: params.dataUrl,
        textContent: params.textContent,
        fileName: params.fileName
      })
      if (!file.ok) return file
      return uploadTempShareFile(file.path, params.expire ?? '24h').finally(() => file.cleanup())
    }
  )
}
