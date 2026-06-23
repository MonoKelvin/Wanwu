<script setup lang="ts">
defineOptions({ name: 'PixelHomeView' })

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import PixelRecentTable from '@modules/library/pixel-art/components/PixelRecentTable.vue'
import PixelHomeSearch from '@modules/library/pixel-art/components/PixelHomeSearch.vue'
import PixelSizePresetCard from '@modules/library/pixel-art/components/PixelSizePresetCard.vue'
import PixelNewDocumentDialog from '@modules/library/pixel-art/components/PixelNewDocumentDialog.vue'
import PixelImportImageDialog from '@modules/library/pixel-art/components/PixelImportImageDialog.vue'
import WwSegmentTabs from '@shared/components/WwSegmentTabs.vue'
import { usePixelImageImportFlow } from '@modules/library/pixel-art/composables/usePixelImageImportFlow'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'
import {
  PIXEL_TEMPLATE_CATEGORY_LABELS,
  getTemplatesByCategory,
  type PixelTemplateCategory
} from '@modules/library/pixel-art/lib/pixelDisplayMapping'
import { openBlankEditor } from '@modules/library/pixel-art/composables/usePixelEditorState'
import { usePixelCatalogCommands } from '@modules/library/pixel-art/composables/usePixelCatalogCommands'
import {
  formatPixelDimensions,
  formatRelativeTime,
  normalizePixelTitleInput,
  pixelTitleBase,
  sortRecentPixelFiles
} from '@modules/library/pixel-art/lib/pixelHomeUtils'
import { pushShellRoute } from '@app/composables/shellNavigation'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { useMinuteClock } from '@shared/composables/useMinuteClock'
import { LIBRARY_PIXEL_ART_EDITOR_ROUTE, LIBRARY_PIXEL_ART_FOLDER, PA_FILES } from '@modules/library/pixel-art/domain/meta'
import type { PixelDocument, PixelFileMeta, PixelSearchHit } from '@modules/library/pixel-art/domain/types'

const router = useRouter()
const store = usePixelArtStore()
const toast = useWanwuToast()
const catalog = usePixelCatalogCommands()
const nowTs = useMinuteClock()
const loading = ref(true)

const searchQuery = ref('')
const searchHits = ref<PixelSearchHit[]>([])
const searchLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchGen = 0

const actionTarget = ref<PixelFileMeta | null>(null)
const renameOpen = ref(false)
const renameValue = ref('')

const newDialogOpen = ref(false)
const newBusy = ref(false)
const activeTemplateCategory = ref<PixelTemplateCategory>('square')

const {
  importDialogOpen,
  importSource,
  importOnlineMode,
  importBusy,
  startImportLocalImage,
  startImportOnlineImage,
  onImportDialogConfirm
} = usePixelImageImportFlow({ router })

const templateTabOptions = computed(() =>
  templateCategories.map((cat) => ({
    label: PIXEL_TEMPLATE_CATEGORY_LABELS[cat],
    value: cat
  }))
)

const trimmedSearch = computed(() => searchQuery.value.trim())
const isSearchActive = computed(() => Boolean(trimmedSearch.value))

const recentFiles = computed(() => sortRecentPixelFiles(store.recentFiles))

const headerSubtitle = computed(() => {
  const count = recentFiles.value.length
  return count > 0 ? `最近 ${count} 个 · 本地像素创作` : '本地像素创作与整理'
})

const templateCategories: PixelTemplateCategory[] = ['square', 'desktop', 'mobile', 'web']

const activeTemplates = computed(() => getTemplatesByCategory(activeTemplateCategory.value))

const { revealFile, softDeleteFile } = usePixelCatalogCommands({
  afterMutate: async () => {
    await store.loadRecent(24)
    await store.refreshRecycleCount()
  }
})

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
    const hits = await window.wanwu.pixelArt.searchFiles({ query: q, limit: 30 })
    if (gen !== searchGen) return
    searchHits.value = hits
  } finally {
    if (gen === searchGen) searchLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([store.loadFolders(), store.loadRecent(24), store.refreshRecycleCount()])
  loading.value = false
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  searchGen++
})

function openNewWizard() {
  newDialogOpen.value = true
}

function openTemplate(width: number, height: number) {
  void openBlankEditor(router, width, height)
}

async function onNewDocumentConfirm(payload: {
  title: string
  content: PixelDocument
  contentPath?: string
}) {
  newBusy.value = true
  try {
    const result = await catalog.file.create(
      PA_FILES,
      payload.title,
      payload.content.meta.width,
      payload.content.meta.height,
      payload.content,
      payload.contentPath
    )
    if (!result.ok) {
      toast.error(result.message ?? '创建失败')
      return
    }
    const record = result.data as { meta?: { id: string } } | undefined
    const fileId = record?.meta?.id
    if (!fileId) {
      toast.error('创建失败')
      return
    }
    newDialogOpen.value = false
    toast.success('已创建')
    await store.loadRecent(24)
    await pushShellRoute(router, {
      name: LIBRARY_PIXEL_ART_EDITOR_ROUTE,
      params: { fileId }
    })
  } finally {
    newBusy.value = false
  }
}

async function openRecent(fileId: string) {
  await pushShellRoute(router, { name: LIBRARY_PIXEL_ART_EDITOR_ROUTE, params: { fileId } })
}

async function openAllFiles() {
  await pushShellRoute(router, {
    name: LIBRARY_PIXEL_ART_FOLDER,
    params: { folderId: PA_FILES }
  })
}

function openRename(file: PixelFileMeta) {
  actionTarget.value = file
  renameValue.value = pixelTitleBase(file.title)
  renameOpen.value = true
}

async function commitRename() {
  const file = actionTarget.value
  if (!file) return
  const title = normalizePixelTitleInput(renameValue.value)
  if (!title || title === pixelTitleBase(file.title)) {
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
</script>

<template>
  <ModulePageLayout>
    <template #header>
      <PageHeader title="像素画" :subtitle="headerSubtitle" stacked-titles />
    </template>

    <div class="pa-page-inner pa-page-inner--home pa-fade-in">
      <div class="pa-home__search-fixed">
        <PixelHomeSearch
          v-model:search-query="searchQuery"
          :hits="searchHits"
          :loading="searchLoading"
          :show-results="false"
          @select="openRecent"
        />
      </div>

      <div class="pa-home__scroll ww-scroll-main">
        <div v-if="isSearchActive" class="pa-home-search-results">
          <p v-if="searchLoading" class="pa-hint pa-home-search-results__status">搜索中…</p>
          <p v-else-if="!searchHits.length" class="pa-hint pa-home-search-results__status">
            未找到匹配的像素画
          </p>
          <ul v-else class="pa-home-search-results__list">
            <li v-for="row in searchHits" :key="row.meta.id">
              <button type="button" class="pa-home-search-hit" @click="openRecent(row.meta.id)">
                <span class="pa-home-search-hit__icon">
                  <WwIcon name="layout-grid" size="sm" />
                </span>
                <span class="pa-home-search-hit__body">
                  <span class="pa-home-search-hit__title">{{ pixelTitleBase(row.meta.title) }}</span>
                  <span class="pa-home-search-hit__meta">
                    {{ formatPixelDimensions(row.meta) }} ·
                    {{ formatRelativeTime(row.meta.updatedAt, nowTs) }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </div>

        <template v-else>
          <section class="pa-block">
            <h3 class="pa-section-label">新建</h3>
            <div class="pa-home-actions">
              <button type="button" class="pa-home-action pa-home-action--primary" @click="openNewWizard">
                <WwIcon name="plus" size="sm" />
                <span>新建空白</span>
              </button>
              <button
                type="button"
                class="pa-home-action"
                :disabled="importBusy"
                @click="startImportLocalImage"
              >
                <WwIcon name="folder-open" size="sm" />
                <span>本地图片</span>
              </button>
              <button
                type="button"
                class="pa-home-action"
                :disabled="importBusy"
                @click="startImportOnlineImage"
              >
                <WwIcon name="link" size="sm" />
                <span>在线图片</span>
              </button>
            </div>
          </section>

          <section class="pa-block">
            <h3 class="pa-section-label">模板</h3>
            <WwSegmentTabs
              v-model="activeTemplateCategory"
              :options="templateTabOptions"
              wide
              class="pa-home-template-tabs"
              aria-label="模板分类"
            />
            <div class="pa-type-grid">
              <PixelSizePresetCard
                v-for="tpl in activeTemplates"
                :key="tpl.id"
                :width="tpl.width"
                :height="tpl.height"
                @click="openTemplate(tpl.width, tpl.height)"
              />
            </div>
          </section>

          <section class="pa-block">
            <div class="pa-section-head">
              <h3 class="pa-section-label">最近打开</h3>
              <div class="pa-section-head__aside">
                <span v-if="recentFiles.length" class="pa-section-meta">{{ recentFiles.length }} 个</span>
                <button type="button" class="pa-section-link" @click="openAllFiles">查看全部</button>
              </div>
            </div>

            <p v-if="loading" class="pa-hint pa-hint--center">加载中…</p>
            <PixelRecentTable
              v-else-if="recentFiles.length"
              :files="recentFiles"
              @open="openRecent"
              @rename="openRename"
              @reveal="revealFile"
              @soft-delete="softDeleteFile"
            />
            <div v-else class="pa-home-recent-empty">
              <EmptyState
                compact
                variant="empty"
                title="暂无最近文件"
                description="点击「新建空白」、导入图片或选择模板尺寸开始创作"
              />
            </div>
          </section>
        </template>
      </div>
    </div>

    <PixelNewDocumentDialog
      v-model:open="newDialogOpen"
      :busy="newBusy"
      @confirm="onNewDocumentConfirm"
    />

    <PixelImportImageDialog
      v-model:open="importDialogOpen"
      :source="importSource"
      :online-mode="importOnlineMode"
      :busy="importBusy"
      @confirm="onImportDialogConfirm"
    />

    <Dialog
      v-model:visible="renameOpen"
      header="重命名文件"
      modal
      append-to="body"
      class="ww-glass-dialog w-[min(22rem,92vw)]"
    >
      <label class="pa-rename-filename-field">
        <span class="pa-rename-filename-field__label">文件名</span>
        <InputText
          v-model="renameValue"
          autofocus
          placeholder="未命名像素画"
          @keydown.enter.prevent="commitRename"
        />
      </label>
      <template #footer>
        <WwButton label="取消" severity="secondary" text @click="renameOpen = false" />
        <WwButton label="确定" @click="commitRename" />
      </template>
    </Dialog>
  </ModulePageLayout>
</template>

<style>
@import '../../core/styles/library-shared.css';
@import '../assets/pixel-shared.css';
</style>
