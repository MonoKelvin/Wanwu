<script setup lang="ts">
defineOptions({ name: 'DiagramFileListView' })

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import LinkFolderNameDialog from '@modules/library/links/components/LinkFolderNameDialog.vue'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import DiagramFolderPickerDialog from '@modules/library/diagrams/components/DiagramFolderPickerDialog.vue'
import DiagramRecentTable from '@modules/library/diagrams/components/DiagramRecentTable.vue'
import {
  diagramFileNameMatchesQuery,
  diagramTitleBase,
  formatDiagramListCountLabel,
  normalizeDiagramTitleInput,
  restoreRecentFile,
  sortFolderDiagramFiles,
  sortRecycleDiagramFiles,
  type DiagramFileSortField
} from '@modules/library/diagrams/lib/diagramHomeUtils'
import { useDiagramCatalogFileActions } from '@modules/library/diagrams/composables/useDiagramCatalogFileActions'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwIconName } from '@shared/icons/registry'
import type { WwMenuItem } from '@shared/types/menu'
import type { DiagramFileMeta } from '@shared/types/diagrams'
import { useDiagramsStore } from '@shared/stores/diagrams'
import { useDiagramCatalogCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import {
  DG_DRAFTS,
  DG_FILES,
  DG_HOME,
  DG_RECYCLE,
  isDiagramCustomFolderId
} from '@modules/library/diagrams/domain/diagramFolderIds'
import { useDiagramFolderDialogs } from '@modules/library/diagrams/lib/useDiagramFolderDialogs'
import { pushShellRoute } from '@app/composables/shellNavigation'

const route = useRoute()
const router = useRouter()
const store = useDiagramsStore()
const bus = useDiagramCatalogCommandBus()
const confirm = useWanwuConfirm()
const toast = useWanwuToast()
const search = ref('')
const loading = ref(false)

const {
  folderDialogVisible,
  folderDialogTitle,
  folderDialogInitialName,
  openCreateFolderDialog,
  openRenameFolderDialog,
  openDeleteFolderDialog,
  onFolderDialogConfirm
} = useDiagramFolderDialogs({
  navigateFolder: (id) => {
    void pushShellRoute(router, {
      name: 'library-diagrams-folder',
      params: { folderId: id }
    })
  },
  onDeleted: (deletedId) => {
    if (folderId.value === deletedId) {
      void pushShellRoute(router, {
        name: 'library-diagrams-folder',
        params: { folderId: DG_FILES }
      })
    }
  }
})

const sortField = ref<DiagramFileSortField>('updatedAt')
const sortMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)

const sortOptions: Array<{ label: string; value: DiagramFileSortField; wwIcon: WwIconName }> = [
  { label: '更新时间', value: 'updatedAt', wwIcon: 'clock' },
  { label: '创建时间', value: 'createdAt', wwIcon: 'calendar-plus' },
  { label: '文件名', value: 'title', wwIcon: 'arrow-down-a-z' }
]

const currentSort = computed(
  () => sortOptions.find((o) => o.value === sortField.value) ?? sortOptions[0]
)

const sortMenuItems = computed((): WwMenuItem[] =>
  sortOptions.map((opt) => ({
    label: opt.label,
    wwIcon: opt.wwIcon,
    checked: sortField.value === opt.value,
    command: () => {
      sortField.value = opt.value
    }
  }))
)

const actionTarget = ref<DiagramFileMeta | null>(null)
const renameOpen = ref(false)
const renameValue = ref('')
const moveOpen = ref(false)
const moveFolderId = ref(DG_FILES)

const folderId = computed(() => route.params.folderId as string)
const folderName = computed(() => store.folderById(folderId.value)?.name ?? '文件')
const isRecycle = computed(() => folderId.value === DG_RECYCLE)
const isCustomFolder = computed(() => isDiagramCustomFolderId(folderId.value))
const pageSubtitle = computed(() => {
  if (isRecycle.value) return '已删除的 .wfg 文件可恢复或永久清除'
  if (isCustomFolder.value) return '自定义分组 · .wfg 压缩包'
  return '.wfg 压缩包 · 可移至自定义分组'
})

const movableFolders = computed(() =>
  store.folders.filter(
    (f) =>
      f.id !== DG_HOME &&
      f.id !== DG_RECYCLE &&
      f.id !== folderId.value &&
      !f.deletedAt
  )
)

const allFilesInFolder = computed(() => store.filesByFolder[folderId.value] ?? [])

const files = computed(() => {
  let list = allFilesInFolder.value
  const q = search.value.trim()
  if (q) list = list.filter((f) => diagramFileNameMatchesQuery(f.title, q))
  return isRecycle.value
    ? sortRecycleDiagramFiles(list)
    : sortFolderDiagramFiles(list, sortField.value)
})

const listCountLabel = computed(() =>
  formatDiagramListCountLabel({
    total: allFilesInFolder.value.length,
    shown: files.value.length,
    searching: Boolean(search.value.trim()),
    recycle: isRecycle.value
  })
)

const { revealFile, duplicateFile, softDeleteFile } = useDiagramCatalogFileActions({
  afterMutate: async () => {
    await load()
    await store.refreshRecycleCount()
  }
})

function folderNameById(id: string) {
  return store.folderById(id)?.name
}

async function load() {
  loading.value = true
  try {
    await store.loadFiles(folderId.value)
    if (!store.loaded) await store.loadFolders()
    if (isRecycle.value) await store.refreshRecycleCount()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})

watch(folderId, (id, prev) => {
  if (id === DG_DRAFTS) {
    void pushShellRoute(router, {
      name: 'library-diagrams-folder',
      params: { folderId: DG_FILES }
    })
    return
  }
  if (id === DG_HOME) {
    void pushShellRoute(router, { name: 'library-diagrams-home' })
    return
  }
  if (id !== prev) {
    search.value = ''
    void load()
  }
})

async function openFile(fileId: string, options?: { fitView?: boolean }) {
  restoreRecentFile(fileId)
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId },
    query: options?.fitView ? { fitView: '1' } : {}
  })
}

async function createNewDiagram() {
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId: 'new' },
    query: { folderId: folderId.value, template: 'tpl-blank' }
  })
}

function openRename(file: DiagramFileMeta) {
  actionTarget.value = file
  renameValue.value = diagramTitleBase(file.title)
  renameOpen.value = true
}

async function commitRename() {
  const file = actionTarget.value
  if (!file) return
  const title = normalizeDiagramTitleInput(renameValue.value)
  if (!title || title === diagramTitleBase(file.title)) {
    renameOpen.value = false
    return
  }
  const result = await bus.dispatch({
    type: 'file.rename',
    payload: { fileId: file.id, title }
  })
  if (result.ok) {
    renameOpen.value = false
    toast.success('已重命名')
    await load()
  } else {
    toast.error(result.message ?? '重命名失败')
  }
}

function openMove(file: DiagramFileMeta) {
  actionTarget.value = file
  moveFolderId.value = movableFolders.value[0]?.id ?? DG_FILES
  moveOpen.value = true
}

async function commitMove() {
  const file = actionTarget.value
  if (!file) return
  const result = await bus.dispatch({
    type: 'file.move',
    payload: { fileId: file.id, folderId: moveFolderId.value }
  })
  if (result.ok) {
    moveOpen.value = false
    toast.success('已移动')
    await load()
  } else {
    toast.error(result.message ?? '移动失败')
  }
}

async function restore(fileId: string) {
  const result = await bus.dispatch({ type: 'file.restore', payload: { fileId } })
  if (result.ok) {
    const restored = result.data as DiagramFileMeta
    const restoreFolderName = folderNameById(restored.folderId) ?? '文件'
    toast.success(`已恢复至「${restoreFolderName}」`)
    await load()
    await store.refreshRecycleCount()
    await store.loadRecent(24)
  } else {
    toast.error(result.message ?? '恢复失败')
  }
}

async function purge(fileId: string) {
  const ok = await confirm.ask({
    header: '永久删除？',
    message: '删除后无法恢复。',
    danger: true,
    acceptLabel: '永久删除',
    width: 'min(92vw, 22rem)'
  })
  if (!ok) return
  const result = await bus.dispatch({ type: 'file.purge', payload: { fileId } })
  if (result.ok) {
    toast.success('已永久删除')
    await load()
    await store.refreshRecycleCount()
  } else {
    toast.error(result.message ?? '删除失败')
  }
}

async function emptyRecycleBin() {
  const list = allFilesInFolder.value
  if (!list.length) return
  const ok = await confirm.ask({
    header: '清空回收站？',
    message: `将永久删除 ${list.length} 个文件，无法恢复。`,
    danger: true,
    acceptLabel: '清空',
    width: 'min(92vw, 22rem)'
  })
  if (!ok) return
  const results = await Promise.all(
    list.map((file) => bus.dispatch({ type: 'file.purge', payload: { fileId: file.id } }))
  )
  const failed = results.filter((r) => !r.ok).length
  if (failed) toast.error(`有 ${failed} 个文件未能删除`)
  else toast.success('回收站已清空')
  await load()
  await store.refreshRecycleCount()
  await store.loadRecent(24)
}

function toggleSortMenu(event: MouseEvent) {
  const anchor = event.currentTarget
  if (anchor instanceof HTMLElement) sortMenuRef.value?.toggleAnchor(anchor)
}
</script>

<template>
  <ModulePageLayout>
    <template #header>
      <PageHeader :title="folderName" :subtitle="pageSubtitle" stacked-titles>
        <template #leading>
          <span
            v-if="isRecycle || isCustomFolder"
            class="dg-page-header-mark"
            :class="{ 'dg-page-header-mark--danger': isRecycle }"
            aria-hidden="true"
          >
            <WwIcon :name="isRecycle ? 'trash-2' : 'folder'" size="md" />
          </span>
        </template>
        <template #actions>
          <div class="dg-page-header-actions ww-page-toolbar" role="toolbar" aria-label="流程图文件工具">
            <div class="dg-page-header-actions__search-wrap">
              <IconField class="ww-field-search ww-page-toolbar__search dg-page-header-actions__search">
                <WwInputIcon name="search" />
                <InputText
                  v-model="search"
                  :placeholder="isRecycle ? '搜索回收站…' : '搜索 .wfg 文件…'"
                  class="w-full"
                  aria-label="搜索流程图"
                />
              </IconField>
              <button
                v-if="search.trim()"
                type="button"
                class="dg-page-header-actions__clear"
                aria-label="清除搜索"
                @click="search = ''"
              >
                <WwIcon name="x" size="sm" />
              </button>
            </div>
            <div class="dg-page-header-actions__tools">
              <div class="dg-page-header-actions__tool-group">
                <WwButton
                  v-if="isRecycle && allFilesInFolder.length"
                  type="button"
                  icon="trash-2"
                  size="small"
                  variant="outlined"
                  severity="danger"
                  class="dg-page-header-toolbar-btn"
                  aria-label="清空回收站"
                  v-tooltip.bottom="'清空回收站'"
                  @click="emptyRecycleBin"
                />
                <WwButton
                  v-if="!isRecycle"
                  type="button"
                  :icon="currentSort.wwIcon"
                  size="small"
                  variant="outlined"
                  severity="secondary"
                  class="dg-page-header-toolbar-btn"
                  :aria-label="`排序：${currentSort.label}`"
                  v-tooltip.bottom="`排序：${currentSort.label}`"
                  @click="toggleSortMenu"
                />
                <WwContextMenu ref="sortMenuRef" :model="sortMenuItems" />
              </div>
              <div v-if="!isRecycle" class="dg-page-header-actions__tool-group">
                <WwButton
                  type="button"
                  icon="plus"
                  size="small"
                  variant="outlined"
                  severity="secondary"
                  class="dg-page-header-toolbar-btn"
                  aria-label="新建流程图"
                  v-tooltip.bottom="'新建流程图'"
                  @click="createNewDiagram"
                />
                <WwButton
                  type="button"
                  icon="folder-plus"
                  size="small"
                  variant="outlined"
                  severity="secondary"
                  class="dg-page-header-toolbar-btn"
                  aria-label="新建分组"
                  v-tooltip.bottom="'新建分组'"
                  @click="openCreateFolderDialog"
                />
                <WwButton
                  v-if="isCustomFolder"
                  type="button"
                  icon="pencil"
                  size="small"
                  variant="outlined"
                  severity="secondary"
                  class="dg-page-header-toolbar-btn"
                  aria-label="重命名分组"
                  v-tooltip.bottom="'重命名分组'"
                  @click="openRenameFolderDialog(folderId)"
                />
                <WwButton
                  v-if="isCustomFolder"
                  type="button"
                  icon="trash-2"
                  size="small"
                  variant="outlined"
                  severity="danger"
                  class="dg-page-header-toolbar-btn"
                  aria-label="删除分组"
                  v-tooltip.bottom="'删除分组'"
                  @click="openDeleteFolderDialog(folderId)"
                />
              </div>
            </div>
          </div>
        </template>
      </PageHeader>
    </template>

    <div
      class="dg-page-inner dg-page-inner--wide dg-page-inner--list dg-fade-in"
      :class="{ 'dg-page-inner--empty': !loading && !files.length }"
    >
      <p v-if="loading" class="dg-hint dg-hint--center">加载中…</p>

      <div v-else-if="!files.length" class="dg-list-empty">
        <EmptyState
          :variant="isRecycle && !search.trim() ? 'ghost' : 'empty'"
          :title="isRecycle ? '回收站为空' : search.trim() ? '无匹配文件' : '暂无文件'"
          :description="
            isRecycle ?
              '删除的流程图会显示在这里，可恢复或永久清除。'
            : search.trim() ?
              '尝试更换关键词。'
            : '从首页选择模板或打开文件'
          "
        >
          <WwButton
            v-if="!isRecycle && !search.trim()"
            label="新建流程图"
            icon="plus"
            @click="createNewDiagram"
          />
        </EmptyState>
      </div>

      <div v-else class="dg-list-panel-wrap">
        <p v-if="listCountLabel" class="dg-list-panel__meta">{{ listCountLabel }}</p>
        <DiagramRecentTable
          :files="files"
          :folder-name-by-id="folderNameById"
          :variant="isRecycle ? 'recycle' : 'folder'"
          :show-move="movableFolders.length > 0"
          @open="openFile"
          @rename="openRename"
          @copy="duplicateFile"
          @move="openMove"
          @reveal="revealFile"
          @soft-delete="softDeleteFile"
          @restore="restore"
          @purge="purge"
        />
      </div>
    </div>

    <Dialog
      v-model:visible="renameOpen"
      header="重命名文件"
      modal
      append-to="body"
      class="ww-glass-dialog w-[min(22rem,92vw)]"
    >
      <label class="dg-rename-filename-field">
        <span class="dg-rename-filename-field__label">文件名</span>
        <div class="dg-rename-filename">
          <InputText
            v-model="renameValue"
            class="dg-rename-filename__input"
            autofocus
            placeholder="未命名流程图"
            @keydown.enter.prevent="commitRename"
          />
          <span class="dg-rename-filename__ext">.wfg</span>
        </div>
      </label>
      <template #footer>
        <WwButton label="取消" severity="secondary" text @click="renameOpen = false" />
        <WwButton label="确定" @click="commitRename" />
      </template>
    </Dialog>

    <LinkFolderNameDialog
      v-model:visible="folderDialogVisible"
      :title="folderDialogTitle"
      :initial-name="folderDialogInitialName"
      @confirm="onFolderDialogConfirm"
    />

    <DiagramFolderPickerDialog
      v-model:open="moveOpen"
      v-model:folder-id="moveFolderId"
      header="移动到分组"
      confirm-label="移动"
      empty-hint="没有可移动的目标分组"
      :folders="movableFolders"
      @confirm="commitMove"
    />
  </ModulePageLayout>
</template>

<style>
@import '../../core/styles/library-shared.css';
@import '../styles/diagram-shared.css';
</style>
