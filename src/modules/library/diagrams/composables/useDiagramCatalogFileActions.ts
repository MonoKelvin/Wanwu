import { useDiagramCatalogCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import type { DiagramFileMeta } from '@shared/types/diagrams'

export function useDiagramCatalogFileActions(options?: {
  afterMutate?: () => void | Promise<void>
}) {
  const bus = useDiagramCatalogCommandBus()
  const toast = useWanwuToast()
  const confirm = useWanwuConfirm()

  async function runAfterMutate() {
    await options?.afterMutate?.()
  }

  async function revealFile(fileId: string): Promise<void> {
    const path = await window.wanwu.diagrams.getFileContentPath({ fileId })
    if (!path) {
      toast.error('找不到文件位置')
      return
    }
    const result = await window.wanwu.shell.showItemInFolder(path)
    if (!result.ok) toast.error(result.error ?? '无法打开文件位置')
  }

  async function duplicateFile(fileId: string): Promise<boolean> {
    const result = await bus.dispatch({ type: 'file.duplicate', payload: { fileId } })
    if (!result.ok) {
      toast.error(result.message ?? '复制失败')
      return false
    }
    toast.success('已创建副本')
    await runAfterMutate()
    return true
  }

  async function togglePin(file: Pick<DiagramFileMeta, 'id' | 'pinned'>): Promise<boolean> {
    const next = !file.pinned
    const result = await bus.dispatch({
      type: 'file.setPinned',
      payload: { fileId: file.id, pinned: next }
    })
    if (!result.ok) {
      toast.error(result.message ?? '置顶操作失败')
      return false
    }
    toast.success(next ? '已置顶' : '已取消置顶')
    await runAfterMutate()
    return true
  }

  async function softDeleteFile(fileId: string): Promise<boolean> {
    const ok = await confirm.ask({
      header: '移入回收站？',
      message: '.wfg 文件可在回收站中恢复至原分组。',
      danger: true,
      acceptLabel: '移入回收站',
      width: 'min(92vw, 22rem)'
    })
    if (!ok) return false
    const result = await bus.dispatch({ type: 'file.softDelete', payload: { fileId } })
    if (!result.ok) {
      toast.error(result.message ?? '删除失败')
      return false
    }
    toast.success('已移入回收站')
    await runAfterMutate()
    return true
  }

  return {
    revealFile,
    duplicateFile,
    togglePin,
    softDeleteFile
  }
}
