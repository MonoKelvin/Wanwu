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
import PixelImportImageDialog from '@modules/library/pixel-art/components/PixelImportImageDialog.vue'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'
import { PIXEL_MAX_HEIGHT, PIXEL_MAX_WIDTH, PIXEL_SIZE_PRESETS } from '@modules/library/pixel-art/domain/meta'
import { openBlankEditor } from '@modules/library/pixel-art/composables/usePixelEditorState'
import { usePixelCatalogCommands } from '@modules/library/pixel-art/composables/usePixelCatalogCommands'
import { usePixelImageImportFlow } from '@modules/library/pixel-art/composables/usePixelImageImportFlow'
import {
  normalizePixelTitleInput,
  pixelTitleBase,
  sortRecentPixelFiles
} from '@modules/library/pixel-art/lib/pixelHomeUtils'
import { pushShellRoute } from '@app/composables/shellNavigation'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { LIBRARY_PIXEL_ART_EDITOR_ROUTE, LIBRARY_PIXEL_ART_FOLDER } from '@modules/library/pixel-art/domain/meta'
import { PA_FILES } from '@modules/library/pixel-art/domain/meta'
import type { PixelFileMeta, PixelSearchHit } from '@modules/library/pixel-art/domain/types'

const router = useRouter()
const store = usePixelArtStore()
const toast = useWanwuToast()
const catalog = usePixelCatalogCommands()
const loading = ref(true)

const searchQuery = ref('')
const searchHits = ref<PixelSearchHit[]>([])
const searchLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchGen = 0

const actionTarget = ref<PixelFileMeta | null>(null)
const renameOpen = ref(false)
const renameValue = ref('')

const {
  importDialogOpen,
  importSource,
  importBusy,
  startImportLocalImage,
  startImportOnlineImage,
  onImportDialogConfirm
} = usePixelImageImportFlow({ router })

const trimmedSearch = computed(() => searchQuery.value.trim())
const isSearchActive = computed(() => Boolean(trimmedSearch.value))

const recentFiles = computed(() => sortRecentPixelFiles(store.recentFiles))

const headerSubtitle = computed(() => {
  const count = recentFiles.value.length
  return count > 0 ? `最近 ${count} 个 · 本地像素创作` : '本地像素创作与整理'
})

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

function newBlank(size: number) {
  void openBlankEditor(router, size, size)
}

function newCustomSize() {
  const w = Number(prompt('画布宽度（像素）', '64'))
  const h = Number(prompt('画布高度（像素）', '64'))
  if (!Number.isFinite(w) || !Number.isFinite(h)) return
  const width = Math.max(1, Math.min(PIXEL_MAX_WIDTH, Math.floor(w)))
  const height = Math.max(1, Math.min(PIXEL_MAX_HEIGHT, Math.floor(h)))
  void openBlankEditor(router, width, height)
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
      <PixelHomeSearch
        v-model:search-query="searchQuery"
        :hits="searchHits"
        :loading="searchLoading"
        @select="openRecent"
      />

      <template v-if="!isSearchActive">
        <section class="pa-block">
          <h3 class="pa-section-label">导入</h3>
          <div class="pa-home-actions">
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
          <h3 class="pa-section-label">新建画布</h3>
          <div class="pa-type-grid">
            <PixelSizePresetCard
              v-for="size in PIXEL_SIZE_PRESETS"
              :key="size"
              :size="size"
              :label="`${size}×${size}`"
              hint="像素"
              @click="newBlank(size)"
            />
            <PixelSizePresetCard
              size="custom"
              label="自定义"
              hint="任意尺寸"
              @click="newCustomSize"
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
              description="从上方选择尺寸创建新画布，或导入已有图片"
            />
          </div>
        </section>
      </template>
    </div>

    <PixelImportImageDialog
      v-model:open="importDialogOpen"
      :source="importSource"
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
