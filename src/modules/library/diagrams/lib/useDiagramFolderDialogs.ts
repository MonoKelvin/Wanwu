import { computed, ref } from 'vue'
import { useDiagramCatalogCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useDiagramsStore } from '@shared/stores/diagrams'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import type { DiagramFolder } from '@shared/types/diagrams'

export function useDiagramFolderDialogs(options?: {
  navigateFolder?: (folderId: string) => void
  onDeleted?: (folderId: string) => void
}) {
  const store = useDiagramsStore()
  const bus = useDiagramCatalogCommandBus()
  const toast = useWanwuToast()
  const confirm = useWanwuConfirm()

  const folderDialogVisible = ref(false)
  const folderDialogMode = ref<'create' | 'rename'>('create')
  const folderDialogTargetId = ref<string | null>(null)
  const folderDialogInitialName = ref('')

  const folderDialogTitle = computed(() =>
    folderDialogMode.value === 'create' ? '新建分组' : '重命名分组'
  )

  function openCreateFolderDialog() {
    folderDialogMode.value = 'create'
    folderDialogTargetId.value = null
    folderDialogInitialName.value = ''
    folderDialogVisible.value = true
  }

  function openRenameFolderDialog(folderId: string) {
    const folder = store.folderById(folderId)
    if (!folder) return
    folderDialogMode.value = 'rename'
    folderDialogTargetId.value = folderId
    folderDialogInitialName.value = folder.name
    folderDialogVisible.value = true
  }

  async function openDeleteFolderDialog(folderId: string) {
    if (!store.filesByFolder[folderId]) {
      await store.loadFiles(folderId)
    }
    const fileCount = (store.filesByFolder[folderId] ?? []).length
    const folder = store.folderById(folderId)
    const name = folder?.name ?? '分组'

    if (fileCount > 0) {
      toast.error(`分组「${name}」内仍有 ${fileCount} 个文件，请先移走或删除`)
      return
    }

    const ok = await confirm.ask({
      header: '删除分组？',
      message: `确定删除「${name}」？此操作不可撤销。`,
      danger: true,
      acceptLabel: '删除',
      width: 'min(92vw, 22rem)'
    })
    if (!ok) return

    const result = await bus.dispatch({ type: 'folder.delete', payload: { folderId } })
    if (result.ok) {
      toast.success('已删除分组')
      await store.loadFolders()
      options?.onDeleted?.(folderId)
    } else {
      toast.error('删除失败')
    }
  }

  async function onFolderDialogConfirm(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return

    if (folderDialogMode.value === 'create') {
      const result = await bus.dispatch({ type: 'folder.create', payload: { name: trimmed } })
      const folder = result.ok ? (result.data as DiagramFolder | undefined) : undefined
      if (folder?.id) {
        toast.success('已创建分组')
        await store.loadFolders()
        options?.navigateFolder?.(folder.id)
      } else {
        toast.error('创建失败')
      }
      return
    }

    const folderId = folderDialogTargetId.value
    if (!folderId) return
    const result = await bus.dispatch({
      type: 'folder.rename',
      payload: { folderId, name: trimmed }
    })
    if (result.ok) {
      toast.success('已重命名')
      await store.loadFolders()
    } else {
      toast.error('重命名失败')
    }
  }

  return {
    folderDialogVisible,
    folderDialogTitle,
    folderDialogInitialName,
    openCreateFolderDialog,
    openRenameFolderDialog,
    openDeleteFolderDialog,
    onFolderDialogConfirm
  }
}
