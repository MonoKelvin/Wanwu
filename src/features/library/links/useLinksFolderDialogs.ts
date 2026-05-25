import { computed, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { findLinkFolder } from '@features/library/links/linksFolderTree'
import {
  collectFolderScopeIds,
  countBookmarksInFolderScope,
  countChildFoldersInScope
} from '@features/library/links/linksScope'
import { LOCAL_COLLECTIONS_ROOT_ID, useLinksStore } from '@shared/stores/links'

export function useLinksFolderDialogs(options?: {
  /** 删除后若当前正在查看被删目录，跳转到该 id */
  navigateFolder?: (folderId: string) => void
  /** 删除后刷新当前列表 */
  reloadBookmarks?: () => Promise<void>
}) {
  const store = useLinksStore()
  const toast = useToast()

  const folderDialogVisible = ref(false)
  const folderDialogParentId = ref(LOCAL_COLLECTIONS_ROOT_ID)
  const folderDeleteVisible = ref(false)
  const folderDeleteTargetId = ref<string | null>(null)
  const folderDeleteStats = ref({ linkCount: 0, childFolderCount: 0 })

  const folderDeleteName = computed(() => {
    const id = folderDeleteTargetId.value
    if (!id) return ''
    return findLinkFolder(store.folders, id)?.name ?? '目录'
  })

  function openCreateFolderDialog(parentId: string) {
    folderDialogParentId.value = parentId
    folderDialogVisible.value = true
  }

  async function openDeleteFolderDialog(targetId: string) {
    if (!store.allBookmarks.length) await store.loadAllBookmarks()
    folderDeleteTargetId.value = targetId
    folderDeleteStats.value = {
      linkCount: countBookmarksInFolderScope(store.folders, targetId, store.allBookmarks),
      childFolderCount: countChildFoldersInScope(store.folders, targetId)
    }
    folderDeleteVisible.value = true
  }

  async function onFolderDialogConfirm(name: string) {
    try {
      const folder = await store.createLocalFolder(folderDialogParentId.value, name)
      toast.add({ severity: 'success', summary: '已创建目录', life: 2000 })
      if (folder?.id) options?.navigateFolder?.(folder.id)
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: '创建失败',
        detail: e instanceof Error ? e.message : '无法创建目录',
        life: 4000
      })
    }
  }

  async function onFolderDeleteConfirm(moveBookmarksToRoot: boolean) {
    const targetId = folderDeleteTargetId.value
    if (!targetId) return

    const target = findLinkFolder(store.folders, targetId)
    const parentId = target?.parentId ?? LOCAL_COLLECTIONS_ROOT_ID
    const currentId = store.selectedFolderId
    const viewingDeleted =
      !!currentId && collectFolderScopeIds(store.folders, targetId).has(currentId)

    try {
      await store.deleteLocalFolder(targetId, moveBookmarksToRoot)
      toast.add({ severity: 'success', summary: '已删除目录', life: 2000 })
      if (viewingDeleted) {
        options?.navigateFolder?.(
          parentId === LOCAL_COLLECTIONS_ROOT_ID ? LOCAL_COLLECTIONS_ROOT_ID : parentId
        )
      } else {
        await options?.reloadBookmarks?.()
      }
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: '删除失败',
        detail: e instanceof Error ? e.message : '无法删除目录',
        life: 4000
      })
    } finally {
      folderDeleteTargetId.value = null
    }
  }

  return {
    folderDialogVisible,
    folderDialogParentId,
    folderDeleteVisible,
    folderDeleteName,
    folderDeleteStats,
    openCreateFolderDialog,
    openDeleteFolderDialog,
    onFolderDialogConfirm,
    onFolderDeleteConfirm
  }
}
