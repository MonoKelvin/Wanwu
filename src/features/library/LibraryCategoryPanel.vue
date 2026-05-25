<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TreeNode } from 'primevue/treenode'
import IconField from 'primevue/iconfield'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import InputText from 'primevue/inputtext'
import WwCatalogTree from '@shared/components/WwCatalogTree.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import LinkFolderNameDialog from '@features/library/links/LinkFolderNameDialog.vue'
import LinkFolderDeleteDialog from '@features/library/links/LinkFolderDeleteDialog.vue'
import { useLinksFolderDialogs } from '@features/library/links/useLinksFolderDialogs'
import type { CatalogNode } from '@library/types/catalog'
import type { WwMenuItem } from '@shared/types/menu'
import { isLibraryMajorId, type LibraryMajorId } from '@library/config/majors'
import {
  composeLibraryTree,
  handbookCatalogFromCategories,
  sectionTreeForMajor
} from '@features/library/libraryCategoryTree'
import { useIllustratedHandbookStore } from '@shared/stores/illustratedHandbook'
import { LINKS_RECYCLE_BIN_ID, LOCAL_COLLECTIONS_ROOT_ID, useLinksStore } from '@shared/stores/links'
import { filterLinksSourceTreeNodes } from '@features/library/links/linksSearch'
import { resolveLinksEntryTarget } from '@features/library/links/linksNavigation'
import {
  defaultLinksCatalogExpanded,
  readLinksCatalogSelection,
  writeLinksCatalogSelection
} from '@features/library/links/linksCatalogTreeMemory'
import { filterTreeNodes } from '@library/catalog/filterTreeNodes'

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

const handbookCatalog = computed(() => handbookCatalogFromCategories(handbookStore.categories))

const sectionTree = computed(() => {
  const major = activeMajor.value
  if (!major) return []
  return sectionTreeForMajor(major, {
    handbookCategories: handbookCatalog.value,
    linkSourceRoots: linksStore.folders
  })
})

const sectionTreeFiltered = computed(() => {
  let tree = sectionTree.value
  if (activeMajor.value === 'links' && linksStore.isGlobalSearch) {
    tree = filterLinksSourceTreeNodes(
      tree,
      linksStore.folders,
      linksStore.globalSearchMatches
    )
  }
  return tree
})

const libraryTree = computed(() => {
  let tree = composeLibraryTree(activeMajor.value, sectionTreeFiltered.value)
  if (categorySearch.value.trim()) {
    tree = filterTreeNodes(tree, categorySearch.value)
  }
  return tree
})

const expandAllLibraryBranches = computed(
  () =>
    activeMajor.value === 'links' &&
    (linksStore.isGlobalSearch || !!categorySearch.value.trim())
)

const linksDefaultExpanded = computed(() =>
  activeMajor.value === 'links' ? defaultLinksCatalogExpanded() : undefined
)

const showLinksSourceIcons = computed(() => activeMajor.value === 'links')

function syncSelectionFromRoute() {
  const major = activeMajor.value
  if (!major) {
    selectionKeys.value = {}
    return
  }

  if (major === 'links') {
    const folderId = route.params.folderId as string | undefined
    selectionKeys.value = folderId
      ? { [`ln:${folderId}`]: true }
      : readLinksCatalogSelection()
    if (folderId) writeLinksCatalogSelection(selectionKeys.value)
    return
  }

  selectionKeys.value = { [`major:${major}`]: true }

  if (major === 'illustrated-handbook') {
    const catId = route.params.catId as string | undefined
    const subId = route.params.subId as string | undefined
    if (!catId) return
    selectionKeys.value = subId
      ? { [`hb:${catId}::${subId}`]: true }
      : { [`hb:${catId}`]: true }
  }
}

async function loadForMajor(major: LibraryMajorId) {
  if (major === 'illustrated-handbook') {
    await handbookStore.loadCategories()
  } else if (major === 'links') {
    await linksStore.loadFolders()
  }
}

onMounted(async () => {
  if (activeMajor.value) await loadForMajor(activeMajor.value)
  syncSelectionFromRoute()
})

watch(
  () => activeMajor.value,
  async (major) => {
    if (major) await loadForMajor(major)
    syncSelectionFromRoute()
  }
)

watch(
  () => [route.meta.major, route.params.catId, route.params.subId, route.params.folderId],
  () => syncSelectionFromRoute()
)

watch(
  selectionKeys,
  (keys) => {
    if (activeMajor.value === 'links') writeLinksCatalogSelection(keys)
  },
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
  if (activeMajor.value !== 'links') return undefined
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
  if (activeMajor.value !== 'links') return
  event.stopPropagation()
  const key = String(node.key)
  if (!key.startsWith('ln:')) return

  const kind = linksCatalogNodeKind(node)
  if (kind !== 'local-root' && kind !== 'local-folder') return

  const folderId = key.slice(3)
  linksContextDeleteId.value = kind === 'local-folder' ? folderId : null
  linksContextParentId.value =
    kind === 'local-folder' ? folderId : LOCAL_COLLECTIONS_ROOT_ID
  linksContextMenu.value?.show(event)
}

function onNodeSelect(node: TreeNode) {
  const key = String(node.key)

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
        :expand-all-branches="expandAllLibraryBranches"
        :default-expanded-keys="linksDefaultExpanded"
        major-key-prefix="major:"
        :show-child-icons="showLinksSourceIcons"
        child-icon="folder"
        :node-badge="linksCatalogNodeBadge"
        tree-class="ww-catalog-tree--library-majors"
        @select="onNodeSelect"
        @contextmenu="onLinksNodeContextMenu"
      />
      <WwContextMenu
        v-if="activeMajor === 'links'"
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
