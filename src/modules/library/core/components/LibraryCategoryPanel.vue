<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TreeNode } from 'primevue/treenode'
import IconField from 'primevue/iconfield'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import InputText from 'primevue/inputtext'
import WwCatalogTree from '@shared/components/WwCatalogTree.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import LinkFolderNameDialog from '@modules/library/links/components/LinkFolderNameDialog.vue'
import LinkFolderDeleteDialog from '@modules/library/links/components/LinkFolderDeleteDialog.vue'
import { useLinksFolderDialogs } from '@modules/library/links/lib/useLinksFolderDialogs'
import type { CatalogNode } from '@modules/library/core/types/catalog'
import type { WwMenuItem } from '@shared/types/menu'
import { isLibraryMajorId, type LibraryMajorId } from '@modules/library/core/config/majors'
import { useLibraryCatalogTrees } from '@modules/library/core/composables/useLibraryCatalogTrees'
import { isCatalogLoadingNodeKey } from '@modules/library/core/composables/libraryCategoryTree'
import { useIllustratedHandbookStore } from '@shared/stores/illustratedHandbook'
import { LINKS_RECYCLE_BIN_ID, LOCAL_COLLECTIONS_ROOT_ID, useLinksStore } from '@shared/stores/links'
import { resolveLinksEntryTarget } from '@modules/library/links/lib/linksNavigation'
import {
  defaultLinksCatalogExpanded,
  readLinksCatalogSelection,
  writeLinksCatalogSelection
} from '@modules/library/links/lib/linksCatalogTreeMemory'
import {
  readHandbookCatalogSelection,
  writeHandbookCatalogSelection
} from '@modules/library/core/composables/libraryCatalogTreeMemory'

const EXPANDED_STORAGE_KEY = 'wanwu:library:category-tree-expanded'

const route = useRoute()
const router = useRouter()
const handbookStore = useIllustratedHandbookStore()
const linksStore = useLinksStore()

const selectionKeys = ref<Record<string, boolean>>({})
const categorySearch = ref('')

const linksContextMenu = ref<InstanceType<typeof WwContextMenu> | null>(null)
const linksContextMenuOpen = ref(false)
const linksContextParentId = ref<string | null>(null)
const linksContextDeleteId = ref<string | null>(null)

const {
  folderDialogVisible,
  folderDeleteVisible,
  folderDeleteName,
  folderDeleteStats,
  openCreateFolderDialog,
  openDeleteFolderDialog,
  onFolderDialogConfirm,
  onFolderDeleteConfirm
} = useLinksFolderDialogs({
  navigateFolder: (id) => {
    void router.push({ name: 'library-links', params: { folderId: id } })
  }
})

const activeMajor = computed<LibraryMajorId | null>(() => {
  const m = route.meta.major as string | undefined
  if (m && isLibraryMajorId(m)) return m
  return null
})

const {
  libraryTree,
  expandAllBranches,
  ensureMajorLoaded,
  preloadAllMajors,
  onCatalogNodeExpand
} = useLibraryCatalogTrees({
  categorySearch,
  handbookStore,
  linksStore
})

const linksDefaultExpanded = computed(() =>
  activeMajor.value === 'links' ? defaultLinksCatalogExpanded() : {}
)

function selectionFromRoute(): Record<string, boolean> | null {
  const major = activeMajor.value
  if (!major) return null

  if (major === 'links') {
    const folderId = route.params.folderId as string | undefined
    if (folderId) return { [`ln:${folderId}`]: true }
    return null
  }

  if (major === 'illustrated-handbook') {
    const catId = route.params.catId as string | undefined
    const subId = route.params.subId as string | undefined
    if (!catId) return { 'major:illustrated-handbook': true }
    return subId ?
        { [`hb:${catId}::${subId}`]: true }
      : { [`hb:${catId}`]: true }
  }

  return { [`major:${major}`]: true }
}

function persistedSelectionForMajor(major: LibraryMajorId): Record<string, boolean> {
  if (major === 'links') return readLinksCatalogSelection()
  if (major === 'illustrated-handbook') return readHandbookCatalogSelection()
  return {}
}

function keyExistsInTree(nodes: TreeNode[], key: string): boolean {
  for (const node of nodes) {
    if (String(node.key) === key) return true
    if (node.children?.length && keyExistsInTree(node.children, key)) return true
  }
  return false
}

function resolveSelectionKeys(major: LibraryMajorId): Record<string, boolean> {
  const fromRoute = selectionFromRoute()
  if (fromRoute) return fromRoute

  const saved = persistedSelectionForMajor(major)
  const savedKey = Object.keys(saved).find((k) => saved[k])
  if (savedKey && keyExistsInTree(libraryTree.value, savedKey)) return saved

  return { [`major:${major}`]: true }
}

function syncSelectionFromRoute() {
  const major = activeMajor.value
  if (!major) {
    selectionKeys.value = {}
    return
  }

  const keys = resolveSelectionKeys(major)
  selectionKeys.value = keys

  const fromRoute = selectionFromRoute()
  if (fromRoute) {
    if (major === 'links') writeLinksCatalogSelection(fromRoute)
    else if (major === 'illustrated-handbook') writeHandbookCatalogSelection(fromRoute)
  }
}

watch(libraryTree, () => {
  if (!activeMajor.value) return
  const current = Object.keys(selectionKeys.value).find((k) => selectionKeys.value[k])
  if (current && keyExistsInTree(libraryTree.value, current)) return
  syncSelectionFromRoute()
})

function persistSelection(keys: Record<string, boolean>) {
  const major = activeMajor.value
  if (major === 'links') writeLinksCatalogSelection(keys)
  else if (major === 'illustrated-handbook') writeHandbookCatalogSelection(keys)
}

onMounted(() => {
  preloadAllMajors()
  syncSelectionFromRoute()
  if (activeMajor.value) void ensureMajorLoaded(activeMajor.value)
})

watch(
  () => activeMajor.value,
  (major) => {
    syncSelectionFromRoute()
    if (major) void ensureMajorLoaded(major)
  }
)

watch(
  () => [route.meta.major, route.params.catId, route.params.subId, route.params.folderId],
  () => syncSelectionFromRoute()
)

watch(
  selectionKeys,
  (keys) => persistSelection(keys),
  { deep: true }
)

function navigateMajor(majorId: LibraryMajorId) {
  if (majorId === 'illustrated-handbook') {
    void router.push({ name: 'library-illustrated-handbook' })
    return
  }
  const target = resolveLinksEntryTarget()
  if (typeof target === 'string') void router.push(target)
  else void router.push(target)
}

function linksCatalogNodeBadge(node: TreeNode): number | undefined {
  if (String(node.key) !== `ln:${LINKS_RECYCLE_BIN_ID}`) return undefined
  return linksStore.recycleBinCount
}

function linksCatalogNodeKind(node: TreeNode): string | undefined {
  return (node.data as CatalogNode | undefined)?.meta?.kind as string | undefined
}

const linksFolderContextItems = computed((): WwMenuItem[] => {
  const items: WwMenuItem[] = [
    {
      label: '新建目录',
      wwIcon: 'folder-plus',
      command: () => {
        const parent = linksContextParentId.value
        if (!parent) return
        openCreateFolderDialog(parent)
      }
    }
  ]
  if (linksContextDeleteId.value) {
    items.push(
      { separator: true },
      {
        label: '删除目录',
        wwIcon: 'trash-2',
        command: () => {
          const id = linksContextDeleteId.value
          if (!id) return
          void openDeleteFolderDialog(id)
        }
      }
    )
  }
  return items
})

function onLinksNodeContextMenu(event: MouseEvent, node: TreeNode) {
  event.stopPropagation()
  const key = String(node.key)
  if (!key.startsWith('ln:') || isCatalogLoadingNodeKey(key)) return

  const kind = linksCatalogNodeKind(node)
  if (kind !== 'local-root') return

  linksContextDeleteId.value = null
  linksContextParentId.value = LOCAL_COLLECTIONS_ROOT_ID
  linksContextMenu.value?.show(event)
}

function onNodeSelect(node: TreeNode) {
  const key = String(node.key)
  if (isCatalogLoadingNodeKey(key)) return

  if (key.startsWith('major:')) {
    navigateMajor(key.slice('major:'.length) as LibraryMajorId)
    return
  }

  if (key.startsWith('hb:')) {
    const rest = key.slice(3)
    if (rest.includes('::')) {
      const [catId, subId] = rest.split('::')
      void router.push({ name: 'library-illustrated-handbook', params: { catId, subId } })
    } else {
      void router.push({ name: 'library-illustrated-handbook', params: { catId: rest } })
    }
    return
  }

  if (key.startsWith('ln:')) {
    const folderId = key.slice(3)
    void router.push({ name: 'library-links', params: { folderId } })
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-2">
      <IconField class="ww-field-search w-full">
        <WwInputIcon name="search" />
        <InputText
          v-model="categorySearch"
          placeholder="搜索目录…"
          class="w-full"
          aria-label="搜索全库目录"
        />
      </IconField>
    </div>
    <div class="ww-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
      <WwCatalogTree
        :nodes="libraryTree"
        :expanded-storage-key="EXPANDED_STORAGE_KEY"
        v-model:selection-keys="selectionKeys"
        :search-query="categorySearch"
        :expand-all-branches="expandAllBranches"
        :expand-on-search="false"
        :default-expanded-keys="linksDefaultExpanded"
        major-key-prefix="major:"
        :show-child-icons="true"
        child-icon-key-prefix="ln:"
        child-icon="folder"
        :node-badge="linksCatalogNodeBadge"
        tree-class="ww-catalog-tree--library-majors"
        @select="onNodeSelect"
        @contextmenu="onLinksNodeContextMenu"
        @node-expand="onCatalogNodeExpand"
      />
      <WwContextMenu
        ref="linksContextMenu"
        v-model:open="linksContextMenuOpen"
        :model="linksFolderContextItems"
      />
    </div>

    <LinkFolderNameDialog
      v-model:visible="folderDialogVisible"
      title="新建目录"
      @confirm="onFolderDialogConfirm"
    />
    <LinkFolderDeleteDialog
      v-model:visible="folderDeleteVisible"
      :folder-name="folderDeleteName"
      :link-count="folderDeleteStats.linkCount"
      :child-folder-count="folderDeleteStats.childFolderCount"
      @confirm="onFolderDeleteConfirm"
    />
  </div>
</template>

<style>
.ww-field-search {
  width: 100%;
}

.ww-field-search .p-inputtext {
  width: 100%;
  font-size: 0.8125rem;
  padding: 0.4375rem 0.625rem 0.4375rem 1.75rem;
}

.ww-field-search .p-iconfield .p-inputicon {
  inset-block: 0;
  display: flex;
  align-items: center;
  width: 1.75rem;
  font-size: 0.8125rem;
  color: var(--ww-ink-faint);
}
</style>
