<script setup lang="ts">
defineOptions({ name: 'DiagramHomeView' })

import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import DiagramTemplateCard from '@modules/library/diagrams/components/DiagramTemplateCard.vue'
import DiagramHomeSearch from '@modules/library/diagrams/components/DiagramHomeSearch.vue'
import DiagramRecentTable from '@modules/library/diagrams/components/DiagramRecentTable.vue'
import DiagramFolderPickerDialog from '@modules/library/diagrams/components/DiagramFolderPickerDialog.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { listDiagramTemplates } from '@modules/library/diagrams/lib/diagramTemplates'
import {
  dismissRecentFile,
  loadDismissedRecentIds
} from '@modules/library/diagrams/lib/diagramHomeUtils'
import { useDiagramCatalogCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { pushShellRoute } from '@app/composables/shellNavigation'
import { useDiagramsStore } from '@shared/stores/diagrams'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { DG_FILES } from '@modules/library/diagrams/domain/diagramFolderIds'
import type { DiagramContent, DiagramSearchHit } from '@shared/types/diagrams'

const router = useRouter()
const store = useDiagramsStore()
const bus = useDiagramCatalogCommandBus()
const confirm = useWanwuConfirm()
const toast = useWanwuToast()

const templates = listDiagramTemplates().filter((t) => t.id !== 'tpl-blank')
const dismissedIds = ref(loadDismissedRecentIds())

const searchQuery = ref('')
const searchHits = ref<DiagramSearchHit[]>([])
const searchLoading = ref(false)
const contentCache = ref(new Map<string, DiagramContent | null>())

const TEMPLATE_VARIANTS: Record<string, 'flow' | 'decision' | 'steps' | 'org' | 'uml' | 'arch'> = {
  'tpl-flow': 'flow',
  'tpl-decision': 'decision',
  'tpl-swimlane': 'steps',
  'tpl-mind': 'org',
  'tpl-uml-class': 'uml',
  'tpl-use-case': 'uml',
  'tpl-architecture': 'arch',
  'tpl-bpmn': 'steps'
}

const importPickerOpen = ref(false)
const importFolderId = ref(DG_FILES)
const pendingImport = ref<{ content: DiagramContent; sourcePath: string } | null>(null)
const importBusy = ref(false)

const trimmedSearch = computed(() => searchQuery.value.trim())
const isSearchActive = computed(() => Boolean(trimmedSearch.value))

const visibleRecent = computed(() =>
  store.recentFiles
    .filter((file) => !dismissedIds.value.has(file.id))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
)

const headerSubtitle = computed(() => {
  const count = visibleRecent.value.length
  if (!count) return '本地绘制与整理'
  const pinned = visibleRecent.value.filter((f) => f.pinned).length
  return pinned > 0 ? `最近 ${count} 个 · 置顶 ${pinned}` : `最近 ${count} 个`
})

onMounted(async () => {
  await Promise.all([store.loadRecent(24), store.loadFolders()])
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

    const nextCache = new Map(contentCache.value)
    await Promise.all(
      hits.map(async (hit) => {
        if (nextCache.has(hit.meta.id)) return
        const record = await window.wanwu.diagrams.readFile({ fileId: hit.meta.id })
        nextCache.set(hit.meta.id, record?.content ?? null)
      })
    )
    if (gen === searchGen) contentCache.value = nextCache
  } finally {
    if (gen === searchGen) searchLoading.value = false
  }
}

async function openTemplate(templateId: string) {
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId: 'new' },
    query: {
      template: templateId,
      ...(templateId !== 'tpl-blank' ? { fitView: '1' } : {})
    }
  })
}

async function openRecent(fileId: string, options?: { fitView?: boolean }) {
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId },
    query: options?.fitView ? { fitView: '1' } : {}
  })
}

function folderNameById(id: string) {
  return store.folderById(id)?.name
}

async function copyFile(fileId: string) {
  const record = await window.wanwu.diagrams.duplicateFile({ fileId })
  if (!record) {
    toast.error('复制失败')
    return
  }
  toast.success('已创建副本')
  await store.loadRecent(24)
}

async function togglePin(file: { id: string; pinned: boolean }) {
  const next = !file.pinned
  const meta = await window.wanwu.diagrams.setFilePinned({ fileId: file.id, pinned: next })
  if (!meta) {
    toast.error('置顶操作失败')
    return
  }
  toast.success(next ? '已置顶' : '已取消置顶')
  await store.loadRecent(24)
}

async function revealFile(fileId: string) {
  const path = await window.wanwu.diagrams.getFileContentPath({ fileId })
  if (!path) {
    toast.error('找不到文件位置')
    return
  }
  const result = await window.wanwu.shell.showItemInFolder(path)
  if (!result.ok) toast.error(result.error ?? '无法打开文件位置')
}

function dismissRecord(fileId: string) {
  dismissRecentFile(fileId)
  dismissedIds.value = loadDismissedRecentIds()
}

async function softDeleteFile(fileId: string) {
  const ok = await confirm.ask({
    header: '移入回收站？',
    message: '文件可在回收站中恢复。',
    danger: true,
    acceptLabel: '移入回收站',
    width: 'min(92vw, 22rem)'
  })
  if (!ok) return
  const result = await bus.dispatch({ type: 'file.softDelete', payload: { fileId } })
  if (!result.ok) {
    toast.error('删除失败')
    return
  }
  toast.success('已移入回收站')
  await store.loadRecent(24)
  await store.refreshRecycleCount()
}

function templateVariant(id: string): 'flow' | 'decision' | 'steps' | 'org' | 'uml' | 'arch' {
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
    pendingImport.value = { content: result.content, sourcePath: result.sourcePath }
    importFolderId.value = DG_FILES
    importPickerOpen.value = true
  } finally {
    importBusy.value = false
  }
}

async function importDrawioToFolder() {
  if (importBusy.value) return
  importBusy.value = true
  try {
    const record = await window.wanwu.diagrams.importDrawioAndCreate({ folderId: DG_FILES })
    if (!record) {
      toast.error('导入失败')
      return
    }
    if ('canceled' in record) return
    toast.success('已导入 draw.io 图表')
    await store.loadRecent(24)
    await openRecent(record.meta.id, { fitView: true })
  } finally {
    importBusy.value = false
  }
}

async function confirmImportWfg() {
  const pending = pendingImport.value
  if (!pending) return
  importBusy.value = true
  try {
    const record = await window.wanwu.diagrams.importWfgFromSource({
      folderId: importFolderId.value,
      sourcePath: pending.sourcePath,
      content: pending.content
    })
    importPickerOpen.value = false
    pendingImport.value = null
    if (!record) {
      toast.error('导入保存失败')
      return
    }
    toast.success('已导入并保存')
    await store.loadRecent(24)
    await openRecent(record.meta.id, { fitView: true })
  } catch {
    toast.error('导入保存失败')
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
        :content-cache="contentCache"
        @select="openRecent"
      />

      <template v-if="!isSearchActive">
        <section class="dg-block">
          <h3 class="dg-section-label dg-section-label--center">快捷打开</h3>
          <div class="dg-home-actions">
            <button
              type="button"
              class="dg-home-action"
              :disabled="importBusy"
              @click="startImportWfg"
            >
              <WwIcon name="folder-open" size="sm" />
              <span>打开 .wfg 文件</span>
            </button>
            <button
              type="button"
              class="dg-home-action"
              :disabled="importBusy"
              @click="importDrawioToFolder"
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
          <h3 class="dg-section-label">最近打开</h3>
          <DiagramRecentTable
            v-if="visibleRecent.length"
            :files="visibleRecent"
            :folder-name-by-id="folderNameById"
            @open="openRecent"
            @copy="copyFile"
            @toggle-pin="togglePin"
            @reveal="revealFile"
            @dismiss="dismissRecord"
            @soft-delete="softDeleteFile"
          />
          <p v-else class="dg-hint dg-hint--center">暂无最近文件，从上方选择类型开始创建</p>
        </section>
      </template>
    </div>

    <DiagramFolderPickerDialog
      v-model:open="importPickerOpen"
      v-model:folder-id="importFolderId"
      @confirm="confirmImportWfg"
    />
  </ModulePageLayout>
</template>

<style>
@import '../styles/diagram-shared.css';
</style>
