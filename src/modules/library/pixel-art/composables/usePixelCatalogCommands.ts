import { PixelCmd, createPixelCommandBus, type IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { getPixelArtRepository } from '@modules/library/pixel-art/services/pixelArtStore'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import { serializePixelDocumentForIpc } from '@modules/library/pixel-art/lib/pixelIpcCodec'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'

let catalogBus: IPixelCommandBus | null = null

function getCatalogCommandBus(): IPixelCommandBus {
  if (catalogBus) return catalogBus
  catalogBus = createPixelCommandBus({
    getSession: () => null,
    getPort: () => null,
    repo: getPixelArtRepository()
  })
  return catalogBus
}

/** 首页 / 文件列表共用的 Catalog 文件 CRUD 命令封装 */
export function usePixelCatalogCommands(options?: {
  afterMutate?: () => void | Promise<void>
}) {
  const bus = getCatalogCommandBus()
  const toast = useWanwuToast()
  const confirm = useWanwuConfirm()

  async function runAfterMutate() {
    await options?.afterMutate?.()
  }

  async function revealFile(fileId: string): Promise<void> {
    const path = await window.wanwu.pixelArt.getFileContentPath({ fileId })
    if (!path) {
      toast.error('找不到文件位置')
      return
    }
    const result = await window.wanwu.shell.showItemInFolder(path)
    if (!result.ok) toast.error(result.error ?? '无法打开文件位置')
  }

  async function softDeleteFile(fileId: string): Promise<boolean> {
    const ok = await confirm.ask({
      header: '移入回收站？',
      message: '删除后可在回收站恢复，并回到原来的分组。',
      danger: true,
      acceptLabel: '移入回收站',
      width: 'min(92vw, 22rem)'
    })
    if (!ok) return false
    const result = await bus.dispatch({ type: PixelCmd.Catalog.File.SoftDelete, payload: { fileId } })
    if (!result.ok) {
      toast.error(result.message ?? '移入回收站失败')
      return false
    }
    toast.success('已移入回收站')
    await runAfterMutate()
    return true
  }

  return {
    bus,
    revealFile,
    softDeleteFile,
    file: {
      create: (
        folderId: string,
        title: string,
        width?: number,
        height?: number,
        content?: PixelDocument,
        contentPath?: string
      ) =>
        bus.dispatch({
          type: PixelCmd.Catalog.File.Create,
          payload: {
            folderId,
            title,
            width,
            height,
            content: content ? serializePixelDocumentForIpc(content) : undefined,
            contentPath
          }
        }),
      importFromImage: (folderId: string, title: string, content: PixelDocument) =>
        bus.dispatch({
          type: PixelCmd.Catalog.File.ImportFromImage,
          payload: { folderId, title, content: serializePixelDocumentForIpc(content) }
        }),
      rename: (fileId: string, title: string) =>
        bus.dispatch({ type: PixelCmd.Catalog.File.Rename, payload: { fileId, title } }),
      softDelete: (fileId: string) =>
        bus.dispatch({ type: PixelCmd.Catalog.File.SoftDelete, payload: { fileId } }),
      restore: (fileId: string) =>
        bus.dispatch({ type: PixelCmd.Catalog.File.Restore, payload: { fileId } }),
      purge: (fileId: string) =>
        bus.dispatch({ type: PixelCmd.Catalog.File.Purge, payload: { fileId } })
    }
  }
}
