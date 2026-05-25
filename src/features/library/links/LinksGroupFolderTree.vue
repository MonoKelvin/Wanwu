<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TreeNode } from 'primevue/treenode'
import WwCatalogTree from '@shared/components/WwCatalogTree.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import {
  ancestorExpandedKeysForFolder,
  buildLinksWorkspaceFolderTree,
  defaultExpandedKeysForFolder,
  resolveLinksGroupRoot
} from '@features/library/links/linksFolderTree'
import { filterTreeNodesByFolderIds } from '@features/library/links/linksSearch'
import {
  readLinksFolderTreeSelection,
  writeLinksFolderTreeSelection
} from '@features/library/links/linksFolderTreeMemory'
import { LOCAL_COLLECTIONS_ROOT_ID } from '@shared/stores/links'
import type { LinkFolder } from '@shared/types/links'

const FOLDER_TREE_EXPANDED_KEY = 'wanwu:links:folder-tree-expanded'

const props = defineProps<{
  folders: LinkFolder[]
  folderId: string
  matchingFolderIds?: Set<string> | null
}>()

const emit = defineEmits<{
  selectFolder: [folderId: string]
  createFolder: [parentId: string]
  deleteFolder: [folderId: string]
}>()

const contextMenu = ref<InstanceType<typeof WwContextMenu> | null>(null)
const contextMenuOpen = ref(false)
const contextParentId = ref<string | null>(null)
const contextTargetFolderId = ref<string | null>(null)

const selectionKeys = ref<Record<string, boolean>>(readLinksFolderTreeSelection())
const folderTreeDefaults = ref<Record<string, boolean>>({})

const bootstrappedSourceId = ref<string | null>(null)

const group = computed(() => resolveLinksGroupRoot(props.folders, props.folderId))

const treeNodes = computed(() => {
  if (!group.value || group.value.kind === 'recycle') return []
  const nodes = buildLinksWorkspaceFolderTree(group.value)
  return filterTreeNodesByFolderIds(nodes, props.matchingFolderIds ?? null)
})

function persistSelection() {
  writeLinksFolderTreeSelection(selectionKeys.value)
}

function syncSelection() {
  if (!group.value) {
    selectionKeys.value = {}
    persistSelection()
    return
  }

  if (group.value.kind === 'local') {
    if (props.folderId === LOCAL_COLLECTIONS_ROOT_ID) {
      selectionKeys.value = { [`src:${LOCAL_COLLECTIONS_ROOT_ID}`]: true }
      persistSelection()
      return
    }
    const fldKey = `fld:${props.folderId}`
    const exists = (nodes: TreeNode[]): boolean => {
      for (const n of nodes) {
        if (String(n.key) === fldKey) return true
        if (n.children?.length && exists(n.children)) return true
      }
      return false
    }
    selectionKeys.value = exists(treeNodes.value) ? { [fldKey]: true } : {}
    persistSelection()
    return
  }

  const rootKey = `src:${group.value.root.id}`
  if (props.folderId === group.value.root.id) {
    selectionKeys.value = { [rootKey]: true }
    persistSelection()
    return
  }
  const fldKey = `fld:${props.folderId}`
  const exists = (nodes: TreeNode[]): boolean => {
    for (const n of nodes) {
      if (String(n.key) === fldKey) return true
      if (n.children?.length && exists(n.children)) return true
    }
    return false
  }
  selectionKeys.value = exists(treeNodes.value) ? { [fldKey]: true } : { [rootKey]: true }
  persistSelection()
}

function mergeFolderTreeDefaults(keys: Record<string, boolean>) {
  folderTreeDefaults.value = { ...folderTreeDefaults.value, ...keys }
}

function bootstrapExpandedForSource() {
  if (!group.value || group.value.kind === 'recycle') return
  const sourceId = group.value.root.id
  if (bootstrappedSourceId.value === sourceId) return
  bootstrappedSourceId.value = sourceId
  mergeFolderTreeDefaults(defaultExpandedKeysForFolder(group.value, props.folderId))
}

watch(
  () => group.value?.root.id,
  () => {
    bootstrapExpandedForSource()
    syncSelection()
  },
  { immediate: true }
)

watch(
  () => props.folderId,
  () => {
    if (group.value) {
      mergeFolderTreeDefaults(ancestorExpandedKeysForFolder(group.value, props.folderId))
    }
    syncSelection()
  }
)

watch(treeNodes, () => syncSelection())

watch(
  selectionKeys,
  () => persistSelection(),
  { deep: true }
)

const canCreateUnder = computed(() => group.value?.kind === 'local')

const folderContextItems = computed((): WwMenuItem[] => {
  const items: WwMenuItem[] = [
    {
      label: '新建目录',
      wwIcon: 'folder-plus',
      command: () => {
        const parent = contextParentId.value
        if (!parent) return
        emit('createFolder', parent)
      }
    }
  ]
  if (contextTargetFolderId.value) {
    items.push(
      { separator: true },
      {
        label: '删除目录',
        wwIcon: 'trash-2',
        command: () => {
          const id = contextTargetFolderId.value
          if (!id) return
          emit('deleteFolder', id)
        }
      }
    )
  }
  return items
})

function resolveContextParentId(node: TreeNode): string | null {
  if (!group.value || group.value.kind !== 'local') return null
  const key = String(node.key)
  if (key.startsWith('fld:')) return key.slice(4)
  return LOCAL_COLLECTIONS_ROOT_ID
}

function onContextMenu(event: MouseEvent, node: TreeNode) {
  if (!canCreateUnder.value) return
  event.stopPropagation()
  const key = String(node.key)
  contextTargetFolderId.value = key.startsWith('fld:') ? key.slice(4) : null
  contextParentId.value = resolveContextParentId(node)
  contextMenu.value?.show(event)
}

function onBlankContextMenu(event: MouseEvent) {
  if (!canCreateUnder.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.ww-catalog-tree .p-tree-node-content, .ww-catalog-tree__label')) {
    return
  }
  contextTargetFolderId.value = null
  contextParentId.value = LOCAL_COLLECTIONS_ROOT_ID
  contextMenu.value?.show(event)
}

function onNodeSelect(node: TreeNode) {
  const key = String(node.key)
  if (key.startsWith('src:')) {
    emit('selectFolder', key.slice(4))
    return
  }
  if (key.startsWith('fld:')) {
    emit('selectFolder', key.slice(4))
  }
}
</script>

<template>
  <div
    v-if="group && group.kind !== 'recycle'"
    class="ww-links-folder-panel h-full min-h-0"
    @contextmenu.prevent="onBlankContextMenu"
  >
    <WwCatalogTree
      :nodes="treeNodes"
      v-model:selection-keys="selectionKeys"
      :expanded-storage-key="FOLDER_TREE_EXPANDED_KEY"
      :default-expanded-keys="folderTreeDefaults"
      major-key-prefix=""
      :show-child-icons="true"
      child-icon="folder"
      tree-class="ww-catalog-tree--folder-nav"
      :expand-all-branches="!!matchingFolderIds"
      empty-label="暂无子目录；右键可新建"
      @select="onNodeSelect"
      @contextmenu="onContextMenu"
    />
    <WwContextMenu
      v-if="canCreateUnder"
      ref="contextMenu"
      v-model:open="contextMenuOpen"
      :model="folderContextItems"
    />
  </div>
</template>

<style>
.ww-links-folder-panel {
  width: 100%;
  min-width: 0;
  background: var(--ww-panel);
  border-radius: 0.5rem;
  padding: 0.25rem 0.125rem;
}
</style>
