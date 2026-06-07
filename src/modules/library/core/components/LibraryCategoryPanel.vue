<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
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
import { useDiagramsStore } from '@shared/stores/diagrams'
import {
  DG_FILES,
  DG_HOME,
  DG_RECYCLE,
  isDiagramCustomFolderId,
  isDiagramSystemFolderId
} from '@modules/library/diagrams/domain/diagramFolderIds'
import { useDiagramFolderDialogs } from '@modules/library/diagrams/lib/useDiagramFolderDialogs'
import { isDiagramEditorRoute } from '@modules/library/diagrams/domain/diagramRoutes'
import {
  defaultDiagramsCatalogExpanded,
  diagramFolderIdFromTreeKey,
  readDiagramCatalogSelection,
  writeDiagramCatalogSelection
} from '@modules/library/diagrams/lib/diagramCatalogTree'
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
import { pushShellRoute } from '@app/composables/shellNavigation'

const EXPANDED_STORAGE_KEY = 'wanwu:library:category-tree-expanded'

const route = useRoute()
const router = useRouter()
const handbookStore = useIllustratedHandbookStore()
const linksStore = useLinksStore()
const diagramsStore = useDiagramsStore()

const selectionKeys = ref<Record<string, boolean>>({})
const categorySearch = ref('')

const linksContextMenu = ref<InstanceType<typeof WwContextMenu> | null>(null)
const linksContextMenuOpen = ref(false)
const linksContextParentId = ref<string | null>(null)
const linksContextDeleteId = ref<string | null>(null)

const diagramsContextMenu = ref<InstanceType<typeof WwContextMenu> | null>(null)
const diagramsContextMenuOpen = ref(false)
const diagramsContextFolderId = ref<string | null>(null)
const diagramsContextMode = ref<'major' | 'custom-folder' | null>(null)

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
    void pushLibraryRoute({ name: 'library-links', params: { folderId: id } })
  }
})

const {
  folderDialogVisible: diagramFolderDialogVisible,
  folderDialogTitle: diagramFolderDialogTitle,
  folderDialogInitialName: diagramFolderDialogInitialName,
  openCreateFolderDialog: openDiagramCreateFolderDialog,
  openRenameFolderDialog: openDiagramRenameFolderDialog,
  openDeleteFolderDialog: openDiagramDeleteFolderDialog,
  onFolderDialogConfirm: onDiagramFolderDialogConfirm
} = useDiagramFolderDialogs({
  navigateFolder: (id) => {
    void pushLibraryRoute({ name: 'library-diagrams-folder', params: { folderId: id } })
  },
  onDeleted: (deletedId) => {
    const current = route.params.folderId as string | undefined
    if (current === deletedId) {
      void pushLibraryRoute({ name: 'library-diagrams-folder', params: { folderId: DG_FILES } })
    }
  }
})

async function pushLibraryRoute(to: RouteLocationRaw) {
  await pushShellRoute(router, to)
}

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
  linksStore,
  diagramsStore
})

const catalogDefaultExpanded = computed(() => {
  if (activeMajor.value === 'links') return defaultLinksCatalogExpanded()
  if (activeMajor.value === 'diagrams') return defaultDiagramsCatalogExpanded()
  return {}
})

function selectionFromRoute(): Record<string, boolean> | null {
  const major = activeMajor.value
  if (!major) return null

  if (major === 'links') {
    const folderId = route.params.folderId as string | undefined
    if (folderId) return { [`ln:${folderId}`]: true }
    return null
  }

  if (major === 'diagrams') {
    const folderId = route.params.folderId as string | undefined
    if (isDiagramEditorRoute(route.name, route.path)) {
      return { 'major:diagrams': true }
    }
    if (folderId) {
      if (isDiagramSystemFolderId(folderId)) return { [`dg:sys:${folderId}`]: true }
      if (isDiagramCustomFolderId(folderId)) return { [`dg:folder:${folderId}`]: true }
    }
    return { [`dg:sys:${DG_HOME}`]: true }
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
  if (major === 'diagrams') return readDiagramCatalogSelection()
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
    else if (major === 'diagrams') writeDiagramCatalogSelection(fromRoute)
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
  else if (major === 'diagrams') writeDiagramCatalogSelection(keys)
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

async function navigateMajor(majorId: LibraryMajorId) {
  if (majorId === 'notes') {
    await pushLibraryRoute({ name: 'library-notes' })
    return
  }
  if (majorId === 'diagrams') {
    await pushLibraryRoute({ name: 'library-diagrams-home' })
    return
  }
  if (majorId === 'illustrated-handbook') {
    await pushLibraryRoute({ name: 'library-illustrated-handbook' })
    return
  }
  const target = resolveLinksEntryTarget()
  if (typeof target === 'string') await pushLibraryRoute(target)
  else await pushLibraryRoute(target)
}

function diagramsCatalogNodeBadge(node: TreeNode): number | undefined {
  const folderId = diagramFolderIdFromTreeKey(String(node.key))
  if (folderId === DG_RECYCLE) return diagramsStore.recycleBinCount
  return undefined
}

function catalogNodeBadge(node: TreeNode): number | undefined {
  return linksCatalogNodeBadge(node) ?? diagramsCatalogNodeBadge(node)
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

const diagramsFolderContextItems = computed((): WwMenuItem[] => {
  if (diagramsContextMode.value === 'major') {
    return [
      {
        label: '新建分组',
        wwIcon: 'folder-plus',
        command: () => openDiagramCreateFolderDialog()
      }
    ]
  }
  if (diagramsContextMode.value === 'custom-folder' && diagramsContextFolderId.value) {
    const folderId = diagramsContextFolderId.value
    return [
      {
        label: '重命名',
        wwIcon: 'pencil',
        command: () => openDiagramRenameFolderDialog(folderId)
      },
      { separator: true },
      {
        label: '删除分组',
        wwIcon: 'trash-2',
        command: () => void openDiagramDeleteFolderDialog(folderId)
      }
    ]
  }
  return []
})

function onCatalogNodeContextMenu(event: MouseEvent, node: TreeNode) {
  event.stopPropagation()
  const key = String(node.key)
  if (isCatalogLoadingNodeKey(key)) return

  if (key === 'major:diagrams') {
    diagramsContextMode.value = 'major'
    diagramsContextFolderId.value = null
    diagramsContextMenu.value?.show(event)
    return
  }

  if (key.startsWith('dg:folder:')) {
    diagramsContextMode.value = 'custom-folder'
    diagramsContextFolderId.value = key.slice('dg:folder:'.length)
    diagramsContextMenu.value?.show(event)
    return
  }

  if (!key.startsWith('ln:')) return

  const kind = linksCatalogNodeKind(node)
  if (kind !== 'local-root') return

  linksContextDeleteId.value = null
  linksContextParentId.value = LOCAL_COLLECTIONS_ROOT_ID
  linksContextMenu.value?.show(event)
}

async function onNodeSelect(node: TreeNode) {
  const key = String(node.key)
  if (isCatalogLoadingNodeKey(key)) return

  if (key.startsWith('major:')) {
    await navigateMajor(key.slice('major:'.length) as LibraryMajorId)
    return
  }

  if (key.startsWith('hb:')) {
    const rest = key.slice(3)
    if (rest.includes('::')) {
      const [catId, subId] = rest.split('::')
      await pushLibraryRoute({ name: 'library-illustrated-handbook', params: { catId, subId } })
    } else {
      await pushLibraryRoute({ name: 'library-illustrated-handbook', params: { catId: rest } })
    }
    return
  }

  if (key.startsWith('ln:')) {
    const folderId = key.slice(3)
    await pushLibraryRoute({ name: 'library-links', params: { folderId } })
    return
  }

  if (key.startsWith('dg:')) {
    const folderId = diagramFolderIdFromTreeKey(key)
    if (!folderId || folderId === DG_HOME) {
      await pushLibraryRoute({ name: 'library-diagrams-home' })
    } else {
      await pushLibraryRoute({ name: 'library-diagrams-folder', params: { folderId } })
    }
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
        :default-expanded-keys="catalogDefaultExpanded"
        major-key-prefix="major:"
        :show-child-icons="true"
        child-icon="folder"
        :node-badge="catalogNodeBadge"
        tree-class="ww-catalog-tree--library-majors"
        @select="onNodeSelect"
        @contextmenu="onCatalogNodeContextMenu"
        @node-expand="onCatalogNodeExpand"
      />
      <WwContextMenu
        ref="linksContextMenu"
        v-model:open="linksContextMenuOpen"
        :model="linksFolderContextItems"
      />
      <WwContextMenu
        ref="diagramsContextMenu"
        v-model:open="diagramsContextMenuOpen"
        :model="diagramsFolderContextItems"
      />
    </div>

    <LinkFolderNameDialog
      v-model:visible="folderDialogVisible"
      title="新建目录"
      @confirm="onFolderDialogConfirm"
    />
    <LinkFolderNameDialog
      v-model:visible="diagramFolderDialogVisible"
      :title="diagramFolderDialogTitle"
      :initial-name="diagramFolderDialogInitialName"
      @confirm="onDiagramFolderDialogConfirm"
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
@import '../styles/library-shared.css';
</style>
