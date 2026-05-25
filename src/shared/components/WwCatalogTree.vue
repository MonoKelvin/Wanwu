<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Tree from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import Badge from 'primevue/badge'
import WwIcon from '@shared/components/WwIcon.vue'
import { usePersistedTreeExpanded } from '@shared/composables/usePersistedTreeExpanded'
import { filterTreeNodes } from '@library/catalog/filterTreeNodes'
import { collectExpandableKeys } from '@library/utils/treeKeys'
import type { WwIconName } from '@shared/icons/registry'
const props = withDefaults(
  defineProps<{
    nodes: TreeNode[]
    /** localStorage 键；空字符串时不自动持久化（需配合 v-model:expanded-keys） */
    expandedStorageKey?: string
    selectionKeys: Record<string, boolean>
    searchQuery?: string
    majorKeyPrefix?: string
    showChildIcons?: boolean
    childIcon?: WwIconName
    emptyLabel?: string
    treeClass?: string
    expandAllBranches?: boolean
    defaultExpandedKeys?: Record<string, boolean>
    nodeBadge?: (node: TreeNode) => string | number | null | undefined
  }>(),
  {
    expandedStorageKey: '',
    searchQuery: '',
    expandAllBranches: false,
    majorKeyPrefix: 'major:',
    showChildIcons: false,
    childIcon: 'folder',
    emptyLabel: '无匹配目录',
    treeClass: ''
  }
)

const expandedKeysModel = defineModel<Record<string, boolean>>('expandedKeys', {
  default: undefined
})

const emit = defineEmits<{
  select: [node: TreeNode]
  'update:selectionKeys': [keys: Record<string, boolean>]
  contextmenu: [event: MouseEvent, node: TreeNode]
}>()

const internalPersisted = props.expandedStorageKey
  ? usePersistedTreeExpanded(props.expandedStorageKey)
  : null

const fallbackExpanded = ref<Record<string, boolean>>({})

const expandedKeys = computed({
  get: () => expandedKeysModel.value ?? internalPersisted?.expandedKeys.value ?? fallbackExpanded.value,
  set: (keys) => {
    const next = keys ?? {}
    if (expandedKeysModel.value !== undefined) {
      expandedKeysModel.value = next
    } else if (internalPersisted) {
      internalPersisted.expandedKeys.value = next
    } else {
      fallbackExpanded.value = next
    }
  }
})

function mergeExpandedKeys(keys: Record<string, boolean>) {
  expandedKeys.value = { ...expandedKeys.value, ...keys }
  internalPersisted?.mergeExpandedKeys(keys)
}

function expandForSearch(nodes: TreeNode[]) {
  internalPersisted?.expandForSearch(nodes)
  if (!internalPersisted && nodes.length) {
    expandedKeys.value = { ...expandedKeys.value, ...collectExpandableKeys(nodes) }
  }
}

function applyDefaultExpanded() {
  if (props.defaultExpandedKeys && Object.keys(props.defaultExpandedKeys).length) {
    mergeExpandedKeys(props.defaultExpandedKeys)
  }
}

onMounted(applyDefaultExpanded)

watch(
  () => props.defaultExpandedKeys,
  () => applyDefaultExpanded(),
  { deep: true }
)

const filteredNodes = computed(() =>
  filterTreeNodes(props.nodes, props.searchQuery ?? '')
)

const selectionModel = computed({
  get: () => props.selectionKeys,
  set: (keys) => emit('update:selectionKeys', keys ?? {})
})

watch([() => props.searchQuery, filteredNodes], () => {
  const q = props.searchQuery?.trim()
  if (q) expandForSearch(filteredNodes.value)
})

watch([() => props.expandAllBranches, filteredNodes], () => {
  if (props.expandAllBranches) expandForSearch(filteredNodes.value)
})

function isMajorNode(node: TreeNode): boolean {
  const prefix = props.majorKeyPrefix
  if (!prefix) return false
  return String(node.key).startsWith(prefix)
}

function nodeIcon(node: TreeNode): WwIconName | null {
  if (isMajorNode(node)) {
    return (node.icon as WwIconName) || 'folder'
  }
  if (!props.showChildIcons) return null
  return (node.icon as WwIconName) || props.childIcon
}

function onNodeSelect(node: TreeNode) {
  emit('select', node)
}

function onNodeContextMenu(event: MouseEvent, node: TreeNode) {
  event.stopPropagation()
  emit('contextmenu', event, node)
}

function badgeForNode(node: TreeNode): string | number | null | undefined {
  return props.nodeBadge?.(node)
}
</script>

<template>
  <Tree
    v-model:expanded-keys="expandedKeys"
    v-model:selection-keys="selectionModel"
    :value="filteredNodes"
    selection-mode="single"
    :class="['ww-catalog-tree w-full border-0 bg-transparent p-0', treeClass]"
    @node-select="onNodeSelect"
  >
    <template #default="{ node }">
      <span
        class="ww-catalog-tree__label inline-flex min-w-0 items-center gap-0.5"
        @contextmenu.prevent="onNodeContextMenu($event, node)"
      >
        <span
          class="ww-catalog-tree__label-main"
          :class="{ 'gap-2': nodeIcon(node) }"
        >
          <WwIcon
            v-if="nodeIcon(node)"
            :name="nodeIcon(node)!"
            size="sm"
            class="shrink-0"
            :class="{ 'ww-catalog-tree__major-icon': isMajorNode(node) }"
          />
          <span
            class="truncate"
            :class="{ 'ww-catalog-tree__major-text font-semibold': isMajorNode(node) }"
          >
            {{ node.label }}
          </span>
        </span>
        <Badge
          v-if="badgeForNode(node) != null"
          :value="badgeForNode(node)!"
          severity="secondary"
          size="small"
          class="ww-catalog-tree__badge"
        />
      </span>
    </template>
  </Tree>
  <p
    v-if="searchQuery?.trim() && filteredNodes.length === 0"
    class="ww-catalog-tree__empty px-2 py-6 text-center text-xs text-ww-ink-muted"
  >
    {{ emptyLabel }}
  </p>
</template>

<style>
/* 目录树（全库分类 / 链接文件夹） */
.ww-catalog-tree .p-tree-node-label,
.ww-library-tree .p-tree-node-label {
  flex: 1;
  min-width: 0;
}

.ww-catalog-tree .p-tree-node-icon,
.ww-library-tree .p-tree-node-icon {
  display: none;
}

.ww-catalog-tree .p-tree-node-toggle-button,
.ww-library-tree .p-tree-node-toggle-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-inline-end: 0.125rem;
  flex-shrink: 0;
  border-radius: 0.25rem;
  color: var(--ww-ink-muted);
}

.ww-library-tree .p-tree-node-toggle-button:hover {
  color: var(--ww-ink);
  background: var(--ww-list-hover-bg);
}

.ww-catalog-tree .p-tree-node-toggle-icon,
.ww-library-tree .p-tree-node-toggle-icon {
  width: 0.75rem;
  height: 0.75rem;
}

.ww-catalog-tree .p-tree-node-content,
.ww-library-tree .p-tree-node-content {
  border-radius: 0.5rem;
  transition:
    background var(--ww-duration-fast) var(--ww-ease-out),
    color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-catalog-tree .p-tree-node-content:hover,
.ww-library-tree .p-tree-node-content:hover {
  background: var(--ww-list-hover-bg);
}

.ww-catalog-tree .p-tree-node-selected > .p-tree-node-content,
.ww-catalog-tree .p-tree-node-content.p-tree-node-selected {
  background: var(--ww-list-selected-bg) !important;
  box-shadow: none !important;
}

.ww-library-tree .p-tree-node-selected > .p-tree-node-content,
.ww-library-tree .p-tree-node-content.p-tree-node-selected {
  background: var(--ww-list-selected-bg) !important;
  color: var(--ww-ink) !important;
  box-shadow: inset 0 0 0 1px var(--ww-list-hover-ring);
}

.ww-catalog-tree--folder-nav .p-tree-node-selected > .p-tree-node-content,
.ww-catalog-tree--folder-nav .p-tree-node-content.p-tree-node-selected {
  box-shadow: none !important;
}

.ww-library-tree--majors > .p-tree-root-children > .p-tree-node > .p-tree-node-content {
  font-weight: 600;
}

.ww-catalog-tree__major-icon,
.ww-library-tree__major-icon {
  color: var(--ww-accent);
}

.ww-catalog-tree__major-text {
  font-weight: 600;
}

.ww-catalog-tree__label {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 0.375rem;
}

.ww-catalog-tree__label-main {
  display: inline-flex;
  min-width: 0;
  flex: 1;
  align-items: center;
}

.ww-catalog-tree__badge {
  flex-shrink: 0;
  margin-inline-start: auto;
}

.ww-catalog-tree__badge .p-badge,
.ww-catalog-tree__badge .p-badge.p-badge-circle,
.ww-catalog-tree__badge .p-badge.p-badge-sm {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 0.6875rem !important;
  width: auto !important;
  height: 1.125rem !important;
  padding: 0 0.3125rem !important;
  font-size: 0.625rem !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  border-radius: 9999px !important;
}
</style>
