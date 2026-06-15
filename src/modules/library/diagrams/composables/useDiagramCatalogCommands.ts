import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandPayloadMap } from '@modules/library/diagrams/app/command/domain/payloads'
import { dispatchDiagramDataCommandTyped } from '@modules/library/diagrams/composables/useDiagramDataCommand'
import { useDiagramCatalogCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

/** 库目录（Catalog）数据命令封装，供首页/列表页使用 */
export function useDiagramCatalogCommands() {
  const bus = useDiagramCatalogCommandBus()

  return {
    bus,
    file: {
      duplicate: (fileId: string) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.File.Duplicate, { fileId }),
      setPinned: (fileId: string, pinned: boolean) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.File.SetPinned, { fileId, pinned }),
      softDelete: (fileId: string) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.File.SoftDelete, { fileId }),
      rename: (fileId: string, title: string) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.File.Rename, { fileId, title }),
      move: (fileId: string, folderId: string) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.File.Move, { fileId, folderId }),
      restore: (fileId: string) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.File.Restore, { fileId }),
      purge: (fileId: string) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.File.Purge, { fileId })
    },
    folder: {
      create: (name: string) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.Folder.Create, { name }),
      rename: (folderId: string, name: string) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.Folder.Rename, { folderId, name }),
      delete: (folderId: string) =>
        dispatchDiagramDataCommandTyped(bus, DiagramCmd.Catalog.Folder.Delete, { folderId })
    },
    dispatch: <K extends keyof DiagramCommandPayloadMap>(
      id: K,
      payload: DiagramCommandPayloadMap[K]
    ) => dispatchDiagramDataCommandTyped(bus, id, payload)
  }
}
