<script setup lang="ts">
defineOptions({ name: 'PixelFileListView' })

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import PixelRecentTable from '@modules/library/pixel-art/components/PixelRecentTable.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import type { PixelFileMeta } from '@modules/library/pixel-art/domain/types'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'
import { usePixelCatalogCommands } from '@modules/library/pixel-art/composables/usePixelCatalogCommands'
import {
  formatPixelListCountLabel,
  normalizePixelTitleInput,
  pixelFileNameMatchesQuery,
  pixelTitleBase,
  PIXEL_FILE_SORT_OPTIONS,
  sortFolderPixelFiles,
  sortRecyclePixelFiles,
  type PixelFileSortField
} from '@modules/library/pixel-art/lib/pixelHomeUtils'
import { pushShellRoute } from '@app/composables/shellNavigation'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import {
  LIBRARY_PIXEL_ART_EDITOR_ROUTE,
  LIBRARY_PIXEL_ART_FOLDER,
  LIBRARY_PIXEL_ART_HOME,
  PA_FILES,
  PA_HOME,
  PA_RECYCLE,
  isPixelCustomFolderId
} from '@modules/library/pixel-art/domain/meta'

const route = useRoute()
const router = useRouter()
const store = usePixelArtStore()
const catalog = usePixelCatalogCommands()
const confirm = useWanwuConfirm()
const toast = useWanwuToast()
const loading = ref(false)
const search = ref('')

const sortField = ref<PixelFileSortField>('updatedAt')
const sortMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)

const currentSort = computed(
  () => PIXEL_FILE_SORT_OPTIONS.find((o) => o.value === sortField.value) ?? PIXEL_FILE_SORT_OPTIONS[0]
)

const sortMenuItems = computed((): WwMenuItem[] =>
  PIXEL_FILE_SORT_OPTIONS.map((opt) => ({
    label: opt.label,
    wwIcon: opt.wwIcon,
    checked: sortField.value === opt.value,
    command: () => {
      sortField.value = opt.value
    }
  }))
)

const actionTarget = ref<PixelFileMeta | null>(null)
const renameOpen = ref(false)
const renameValue = ref('')

const folderId = computed(() => String(route.params.folderId ?? PA_FILES))
const folderName = computed(() => store.folderById(folderId.value)?.name ?? '文件')
const isRecycle = computed(() => folderId.value === PA_RECYCLE)
const isFilesRoot = computed(() => folderId.value === PA_FILES)

const pageSubtitle = computed(() => {
  if (isRecycle.value) return '删除后保留在此，可恢复或永久清除'
  return '所有已保存的像素画文件'
})

const allFilesInFolder = computed(() => store.filesByFolder[folderId.value] ?? [])

const files = computed(() => {
  let list = allFilesInFolder.value
  const q = search.value.trim()
  if (q) list = list.filter((f) => pixelFileNameMatchesQuery(f.title, q))
  return isRecycle.value ? sortRecyclePixelFiles(list) : sortFolderPixelFiles(list, sortField.value)
})

const listCountLabel = computed(() =>
  formatPixelListCountLabel({
    total: allFilesInFolder.value.length,
    shown: files.value.length,
    searching: Boolean(search.value.trim()),
    recycle: isRecycle.value
  })
)

const hasListContent = computed(() => files.value.length > 0)

async function load() {
  loading.value = true
  try {
    if (!store.loaded) await store.loadFolders()
    await store.loadFiles(folderId.value)
    if (isRecycle.value) await store.refreshRecycleCount()
  } finally {
    loading.value = false
  }
}

const { revealFile, softDeleteFile } = usePixelCatalogCommands({
  afterMutate: async () => {
    await load()
    await store.refreshRecycleCount()
  }
})

onMounted(() => void load())

watch(folderId, (id, prev) => {
  if (id === PA_HOME) {
    void pushShellRoute(router, { name: LIBRARY_PIXEL_ART_HOME })
    return
  }
  if (isPixelCustomFolderId(id)) {
    void pushShellRoute(router, { name: LIBRARY_PIXEL_ART_FOLDER, params: { folderId: PA_FILES } })
    return
  }
  if (id !== prev) {
    search.value = ''
    void load()
  }
})

async function openFile(fileId: string) {
  await pushShellRoute(router, { name: LIBRARY_PIXEL_ART_EDITOR_ROUTE, params: { fileId } })
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
    await load()
  } else {
    toast.error(result.message ?? '重命名失败')
  }
}

async function restore(fileId: string) {
  const result = await catalog.file.restore(fileId)
  if (result.ok) {
    toast.success('已恢复')
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
  const result = await catalog.file.purge(fileId)
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
  const results = await Promise.all(list.map((file) => catalog.file.purge(file.id)))
  const failed = results.filter((r) => !r.ok).length
  if (failed) toast.error(`有 ${failed} 个文件未能删除`)
  else toast.success('回收站已清空')
  await load()
  await store.refreshRecycleCount()
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
            v-if="isRecycle || isFilesRoot"
            class="pa-page-header-mark"
            :class="{ 'pa-page-header-mark--danger': isRecycle }"
            aria-hidden="true"
          >
            <WwIcon :name="isRecycle ? 'trash-2' : 'folder'" size="md" />
          </span>
        </template>
        <template #actions>
          <div class="pa-page-header-actions ww-page-toolbar" role="toolbar" aria-label="像素画文件工具">
            <div class="pa-page-header-actions__search-wrap">
              <IconField class="ww-field-search ww-page-toolbar__search pa-page-header-actions__search">
                <WwInputIcon name="search" />
                <InputText
                  v-model="search"
                  :placeholder="isRecycle ? '搜索回收站…' : '搜索像素画…'"
                  class="w-full"
                  aria-label="搜索像素画"
                />
              </IconField>
              <button
                v-if="search.trim()"
                type="button"
                class="pa-page-header-actions__clear"
                aria-label="清除搜索"
                @click="search = ''"
              >
                <WwIcon name="x" size="sm" />
              </button>
            </div>
            <div v-if="!isRecycle" class="pa-page-header-actions__tools">
              <WwButton
                type="button"
                :icon="currentSort.wwIcon"
                size="small"
                variant="outlined"
                severity="secondary"
                :aria-label="`排序：${currentSort.label}`"
                v-tooltip.bottom="`排序：${currentSort.label}`"
                @click="toggleSortMenu"
              />
              <WwContextMenu ref="sortMenuRef" :model="sortMenuItems" />
            </div>
            <div v-else-if="allFilesInFolder.length" class="pa-page-header-actions__tools">
              <WwButton
                type="button"
                icon="trash-2"
                size="small"
                variant="outlined"
                severity="danger"
                aria-label="清空回收站"
                v-tooltip.bottom="'清空回收站'"
                @click="emptyRecycleBin"
              />
            </div>
          </div>
        </template>
      </PageHeader>
    </template>

    <div
      class="pa-page-inner pa-page-inner--wide pa-page-inner--list pa-fade-in"
      :class="{ 'pa-page-inner--empty': !loading && !hasListContent }"
    >
      <p v-if="loading" class="pa-hint pa-hint--center">加载中…</p>

      <div v-else-if="!hasListContent" class="pa-list-empty">
        <EmptyState
          :variant="isRecycle && !search.trim() ? 'ghost' : 'empty'"
          :title="isRecycle ? '回收站为空' : search.trim() ? '无匹配结果' : '暂无内容'"
          :description="
            isRecycle ?
              '删除的像素画会显示在这里，可恢复或永久清除。'
            : search.trim() ?
              '尝试更换关键词。'
            : '暂无像素画文件。'
          "
        />
      </div>

      <div v-else class="pa-list-panel-wrap">
        <p v-if="listCountLabel" class="pa-list-panel__meta">{{ listCountLabel }}</p>
        <PixelRecentTable
          :files="files"
          :variant="isRecycle ? 'recycle' : 'folder'"
          @open="openFile"
          @rename="openRename"
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
