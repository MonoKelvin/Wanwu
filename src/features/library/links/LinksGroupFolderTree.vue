<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TreeNode } from 'primevue/treenode'
import WwCatalogTree from '@shared/components/WwCatalogTree.vue'
import {
  buildGroupFolderTreeNodes,
  resolveLinksGroupRoot
} from '@features/library/links/linksFolderTree'
import { filterTreeNodesByFolderIds } from '@features/library/links/linksSearch'
import type { LinkFolder } from '@shared/types/links'

const FOLDER_TREE_EXPANDED_KEY = 'wanwu:links:folder-tree-expanded'

const props = defineProps<{
  folders: LinkFolder[]
  folderId: string
  /** 全局搜索时仅展示含匹配链接的文件夹 */
  matchingFolderIds?: Set<string> | null
}>()

const emit = defineEmits<{
  selectFolder: [folderId: string]
}>()

const selectionKeys = ref<Record<string, boolean>>({})

const group = computed(() => resolveLinksGroupRoot(props.folders, props.folderId))

const treeNodes = computed(() => {
  if (!group.value || group.value.kind !== 'edge') return []
  const nodes = buildGroupFolderTreeNodes(group.value)
  return filterTreeNodesByFolderIds(nodes, props.matchingFolderIds ?? null)
})

const showTree = computed(() => treeNodes.value.length > 0)

function syncSelection() {
  const key = `fld:${props.folderId}`
  const exists = (nodes: TreeNode[]): boolean => {
    for (const n of nodes) {
      if (String(n.key) === key) return true
      if (n.children?.length && exists(n.children)) return true
    }
    return false
  }
  selectionKeys.value = exists(treeNodes.value) ? { [key]: true } : {}
}

watch(() => props.folderId, syncSelection, { immediate: true })
watch(treeNodes, syncSelection)

function onNodeSelect(node: TreeNode) {
  const key = String(node.key)
  if (!key.startsWith('fld:')) return
  emit('selectFolder', key.slice(4))
}
</script>

<template>
  <div v-if="showTree" class="ww-links-folder-panel h-full min-h-0">
    <WwCatalogTree
      :nodes="treeNodes"
      :expanded-storage-key="FOLDER_TREE_EXPANDED_KEY"
      v-model:selection-keys="selectionKeys"
      major-key-prefix=""
      :show-child-icons="true"
      child-icon="folder"
      tree-class="ww-catalog-tree--folder-nav"
      :expand-all-branches="!!matchingFolderIds"
      empty-label="无匹配文件夹"
      @select="onNodeSelect"
    />
  </div>
</template>

<style>
.ww-links-folder-panel {
  width: 11.5rem;
  background: var(--ww-panel);
  border-radius: 0.5rem;
  padding: 0.25rem 0.125rem;
}
</style>
