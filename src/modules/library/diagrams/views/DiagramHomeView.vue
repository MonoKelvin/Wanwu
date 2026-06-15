<script setup lang="ts">
defineOptions({ name: 'DiagramHomeView' })

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import WwButton from '@shared/components/WwButton.vue'
import DiagramTemplateCard from '@modules/library/diagrams/components/DiagramTemplateCard.vue'
import DiagramHomeSearch from '@modules/library/diagrams/components/DiagramHomeSearch.vue'
import DiagramRecentTable from '@modules/library/diagrams/components/DiagramRecentTable.vue'
import DiagramFolderPickerDialog from '@modules/library/diagrams/components/DiagramFolderPickerDialog.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { listDiagramTemplates } from '@modules/library/diagrams/lib/diagramTemplates'
import type { DiagramTemplateArtVariant } from '@modules/library/diagrams/lib/diagramTemplateArt'
import {
  dismissRecentFile,
  loadDismissedRecentIds,
  restoreRecentFile,
  sortRecentDiagramFiles
} from '@modules/library/diagrams/lib/diagramHomeUtils'
import { useDiagramCatalogFileActions } from '@modules/library/diagrams/composables/useDiagramCatalogFileActions'
import { useDiagramCatalogCommands } from '@modules/library/diagrams/composables/useDiagramCatalogCommands'
import { cloneForIpc } from '@shared/lib/cloneForIpc'
import { useDiagramsStore } from '@shared/stores/diagrams'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import {
  diagramTitleBase,
  normalizeDiagramTitleInput
} from '@modules/library/diagrams/lib/diagramHomeUtils'
import { DG_FILES, DG_HOME, DG_RECYCLE } from '@modules/library/diagrams/domain/diagramFolderIds'
import { pushShellRoute } from '@app/composables/shellNavigation'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import type { DiagramContent, DiagramFileMeta, DiagramSearchHit } from '@shared/types/diagrams'

const router = useRouter()
const store = useDiagramsStore()
const toast = useWanwuToast()
const catalog = useDiagramCatalogCommands()

const actionTarget = ref<DiagramFileMeta | null>(null)
const renameOpen = ref(false)
const renameValue = ref('')
const fileMoveOpen = ref(false)
const fileMoveFolderId = ref(DG_FILES)

const templates = listDiagramTemplates().filter((t) => t.id !== 'tpl-blank')
const dismissedIds = ref(loadDismissedRecentIds())

const searchQuery = ref('')
const searchHits = ref<DiagramSearchHit[]>([])
const searchLoading = ref(false)
const TEMPLATE_VARIANTS: Record<string, DiagramTemplateArtVariant> = {
  'tpl-flow': 'flow',
  'tpl-decision': 'decision',
  'tpl-swimlane': 'steps',
  'tpl-mind': 'org',
  'tpl-uml-class': 'uml',
  'tpl-use-case': 'use-case',
  'tpl-architecture': 'arch',
  'tpl-bpmn': 'bpmn'
}

const importPickerOpen = ref(false)
const importFolderId = ref(DG_FILES)
const pendingImport = ref<
  | { kind: 'wfg'; content: DiagramContent; sourcePath: string }
  | { kind: 'drawio'; content: DiagramContent; sourcePath: string }
  | null
>(null)
const importBusy = ref(false)

const importPickerHeader = computed(() => {
  if (pendingImport.value?.kind === 'drawio') return '选择 draw.io 导入位置'
  return '选择保存位置'
})

const importPickerConfirmLabel = computed(() =>
  pendingImport.value?.kind === 'drawio' ? '导入' : '保存'
)

const trimmedSearch = computed(() => searchQuery.value.trim())
const isSearchActive = computed(() => Boolean(trimmedSearch.value))

const visibleRecent = computed(() =>
  sortRecentDiagramFiles(
    store.recentFiles.filter((file) => !dismissedIds.value.has(file.id))
  )
)

const movableFolders = computed(() =>
  store.folders.filter(
    (f) => f.id !== DG_HOME && f.id !== DG_RECYCLE && !f.deletedAt
  )
)

const { revealFile, duplicateFile, togglePin, softDeleteFile } = useDiagramCatalogFileActions({
  afterMutate: async () => {
    await store.loadRecent(24)
    await store.refreshRecycleCount()
  }
})

const headerSubtitle = computed(() => {
  const count = visibleRecent.value.length
  if (!count) return '本地绘制与整理'
  const pinned = visibleRecent.value.filter((f) => f.pinned).length
  return pinned > 0 ? `最近 ${count} 个 · 置顶 ${pinned}` : `最近 ${count} 个`
})

onMounted(async () => {
  await Promise.all([store.loadRecent(24), store.loadFolders(), store.refreshRecycleCount()])
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchGen = 0

watch(trimmedSearch, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!q) {
    searchHits.value = []
    searchLoading.value = false
    return
  }
  searchTimer = setTimeout(() => void runSearch(q), 220)
})

async function runSearch(q: string) {
  const gen = ++searchGen
  searchLoading.value = true
  try {
    const hits = await window.wanwu.diagrams.searchFiles({ query: q, limit: 30 })
    if (gen !== searchGen) return
    searchHits.value = hits
  } finally {
    if (gen === searchGen) searchLoading.value = false
  }
}

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  searchGen++
})

async function openTemplate(templateId: string) {
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId: 'new' },
    query: { template: templateId }
  })
}

async function openRecent(fileId: string, options?: { fitView?: boolean }) {
  restoreRecentFile(fileId)
  dismissedIds.value = loadDismissedRecentIds()
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId },
    query: options?.fitView ? { fitView: '1' } : {}
  })
}

function folderNameById(id: string) {
  return store.folderById(id)?.name
}

function dismissRecord(fileId: string) {
  dismissRecentFile(fileId)
  dismissedIds.value = loadDismissedRecentIds()
  toast.success('已从最近列表移除')
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
  const result = await catalog.file.rename(file.id, title)
  if (result.ok) {
    renameOpen.value = false
    toast.success('已重命名')
    await store.loadRecent(24)
  } else {
    toast.error(result.message ?? '重命名失败')
  }
}

function openMove(file: DiagramFileMeta) {
  actionTarget.value = file
  const targets = movableFolders.value.filter((f) => f.id !== file.folderId)
  fileMoveFolderId.value = targets[0]?.id ?? DG_FILES
  fileMoveOpen.value = true
}

async function commitMove() {
  const file = actionTarget.value
  if (!file) return
  const result = await catalog.file.move(file.id, fileMoveFolderId.value)
  if (result.ok) {
    fileMoveOpen.value = false
    toast.success('已移动')
    await store.loadRecent(24)
  } else {
    toast.error(result.message ?? '移动失败')
  }
}

async function openAllFiles() {
  await pushShellRoute(router, {
    name: 'library-diagrams-folder',
    params: { folderId: DG_FILES }
  })
}

function templateVariant(id: string): DiagramTemplateArtVariant {
  return TEMPLATE_VARIANTS[id] ?? 'flow'
}

async function startImportWfg() {
  if (importBusy.value) return
  importBusy.value = true
  try {
    const result = await window.wanwu.diagrams.importWfg()
    if (!result.ok) {
      if (!result.canceled && result.error) toast.error(result.error)
      return
    }
    pendingImport.value = {
      kind: 'wfg',
      content: cloneForIpc(result.content),
      sourcePath: result.sourcePath
    }
    importFolderId.value = DG_FILES
    importPickerOpen.value = true
  } finally {
    importBusy.value = false
  }
}

async function startImportDrawio() {
  if (importBusy.value) return
  importBusy.value = true
  try {
    const result = await window.wanwu.diagrams.importDrawio()
    if (!result.ok) {
      if (!result.canceled && result.error) toast.error(result.error)
      return
    }
    pendingImport.value = {
      kind: 'drawio',
      content: cloneForIpc(result.content),
      sourcePath: result.sourcePath
    }
    importFolderId.value = DG_FILES
    importPickerOpen.value = true
  } finally {
    importBusy.value = false
  }
}

async function confirmImportToFolder() {
  const pending = pendingImport.value
  if (!pending) return
  importBusy.value = true
  try {
    const record =
      pending.kind === 'wfg' ?
        await window.wanwu.diagrams.importWfgFromSource({
          folderId: importFolderId.value,
          sourcePath: pending.sourcePath,
          content: pending.content
        })
      : await window.wanwu.diagrams.createFile({
          folderId: importFolderId.value,
          title: pending.content.meta.title,
          content: pending.content
        })
    importPickerOpen.value = false
    pendingImport.value = null
    if (!record) {
      toast.error('导入保存失败')
      return
    }
    toast.success(pending.kind === 'wfg' ? '已导入并保存' : '已导入 draw.io 图表')
    await store.loadRecent(24)
    await openRecent(record.meta.id, { fitView: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : '导入保存失败'
    toast.error(message)
  } finally {
    importBusy.value = false
  }
}
</script>

<template>
  <ModulePageLayout>
    <template #header>
      <PageHeader title="流程图" :subtitle="headerSubtitle" stacked-titles />
    </template>

    <div class="dg-page-inner dg-page-inner--home dg-fade-in">
      <DiagramHomeSearch
        v-model:search-query="searchQuery"
        :hits="searchHits"
        :loading="searchLoading"
        :folder-name-by-id="folderNameById"
        @select="openRecent"
      />

      <template v-if="!isSearchActive">
        <section class="dg-block">
          <h3 class="dg-section-label">导入</h3>
          <div class="dg-home-actions">
            <button
              type="button"
              class="dg-home-action"
              :disabled="importBusy"
              @click="startImportWfg"
            >
              <WwIcon name="folder-open" size="sm" />
              <span>打开流程图文件</span>
            </button>
            <button
              type="button"
              class="dg-home-action"
              :disabled="importBusy"
              @click="startImportDrawio"
            >
              <WwIcon name="external-link" size="sm" />
              <span>打开 draw.io</span>
            </button>
          </div>
        </section>

        <section class="dg-block">
          <h3 class="dg-section-label">新建类型</h3>
          <div class="dg-type-grid">
            <DiagramTemplateCard name="空白文档" variant="blank" @click="openTemplate('tpl-blank')" />
            <DiagramTemplateCard
              v-for="tpl in templates"
              :key="tpl.id"
              :name="tpl.name"
              :variant="templateVariant(tpl.id)"
              @click="openTemplate(tpl.id)"
            />
          </div>
        </section>

        <section class="dg-block">
          <div class="dg-section-head">
            <h3 class="dg-section-label">最近打开</h3>
            <div class="dg-section-head__aside">
              <span v-if="visibleRecent.length" class="dg-section-meta">{{ visibleRecent.length }} 个</span>
              <button type="button" class="dg-section-link" @click="openAllFiles">查看全部</button>
            </div>
          </div>
          <DiagramRecentTable
            v-if="visibleRecent.length"
            :files="visibleRecent"
            :folder-name-by-id="folderNameById"
            :show-move="movableFolders.length > 1"
            @open="openRecent"
            @rename="openRename"
            @move="openMove"
            @copy="duplicateFile"
            @toggle-pin="togglePin"
            @reveal="revealFile"
            @dismiss="dismissRecord"
            @soft-delete="softDeleteFile"
          />
          <div v-else class="dg-home-recent-empty">
            <EmptyState
              compact
              variant="empty"
              title="暂无最近文件"
              description="从上方选择模板创建，或导入已有图表"
            />
          </div>
        </section>
      </template>
    </div>

    <DiagramFolderPickerDialog
      v-model:open="importPickerOpen"
      v-model:folder-id="importFolderId"
      :header="importPickerHeader"
      :confirm-label="importPickerConfirmLabel"
      @confirm="confirmImportToFolder"
    />

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
        </div>
      </label>
      <template #footer>
        <WwButton label="取消" severity="secondary" text @click="renameOpen = false" />
        <WwButton label="确定" @click="commitRename" />
      </template>
    </Dialog>

    <DiagramFolderPickerDialog
      v-model:open="fileMoveOpen"
      v-model:folder-id="fileMoveFolderId"
      header="移动到分组"
      confirm-label="移动"
      empty-hint="没有可移动的目标分组"
      :folders="movableFolders.filter((f) => f.id !== actionTarget?.folderId)"
      @confirm="commitMove"
    />
  </ModulePageLayout>
</template>

<style>
@import '../assets/diagram-shared.css';
</style>
