<script setup lang="ts">
defineOptions({ name: 'LinksView' })

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { usePopTip } from '@shared/composables/usePopTip'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import LinksToolbar from '@modules/library/links/components/LinksToolbar.vue'
import LinksGroupFolderTree from '@modules/library/links/components/LinksGroupFolderTree.vue'
import LinkBookmarkList from '@modules/library/links/components/LinkBookmarkList.vue'
import LinkBookmarkCard from '@modules/library/links/components/LinkBookmarkCard.vue'
import LinkBookmarkFormDialog from '@modules/library/links/components/LinkBookmarkFormDialog.vue'
import LinkFolderNameDialog from '@modules/library/links/components/LinkFolderNameDialog.vue'
import LinkFolderDeleteDialog from '@modules/library/links/components/LinkFolderDeleteDialog.vue'
import { bookmarkIdsInFolderScope } from '@modules/library/links/lib/linksScope'
import { invalidateFaviconForUrl } from '@modules/library/links/lib/useLinkFavicon'
import { useLinksFolderDialogs } from '@modules/library/links/lib/useLinksFolderDialogs'
import { useLinksLiveSync } from '@modules/library/links/lib/useLinksLiveSync'
import {
  formatLinksSyncDetail,
  hasLinksSyncChanges
} from '@modules/library/links/lib/linksSyncToast'
import { formatLinksProbeDetail } from '@modules/library/links/lib/linksProbeToast'
import WwBlockingLoader from '@shared/components/WwBlockingLoader.vue'
import type { LinksProbeProgress } from '@shared/types/links'
import { resolveLinksGroupRoot } from '@modules/library/links/lib/linksFolderTree'
import {
  folderIdFromRoute,
  writeLastLinksFolderId
} from '@modules/library/links/lib/linksRouteMemory'
import {
  readLinksSortMode,
  sortBookmarksForDisplay,
  writeLinksSortMode,
  type LinksSortMode
} from '@modules/library/links/lib/linksSort'
import { isBrowserRootFolderId } from '@modules/library/links/domain/sources'
import {
  LINKS_RECYCLE_BIN_ID,
  LOCAL_COLLECTIONS_ROOT_ID,
  useLinksStore
} from '@shared/stores/links'
import type { LinkBookmark } from '@shared/types/links'
import type { WwViewMode } from '@shared/components/WwViewModeToggle.vue'

const VIEW_KEY = 'wanwu:links:viewMode'

const route = useRoute()
const router = useRouter()
const store = useLinksStore()
const toast = useToast()
const popTip = usePopTip()

const search = computed({
  get: () => store.searchQuery,
  set: (v: string) => void store.setSearchQuery(v)
})
const viewMode = ref<WwViewMode>(readViewMode())
const sortMode = ref<LinksSortMode>(readLinksSortMode())
const hideUnreachable = ref(false)
const probingLinks = ref(false)
const probeProgress = ref<LinksProbeProgress | null>(null)
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editTarget = ref<LinkBookmark | null>(null)

const folderId = computed(() => folderIdFromRoute(route.params.folderId as string | undefined))
const isRecycleBin = computed(() => folderId.value === LINKS_RECYCLE_BIN_ID)
const canAddBookmark = computed(() => !isRecycleBin.value)
const canCreateFolder = computed(() => group.value?.kind === 'local')

const group = computed(() => resolveLinksGroupRoot(store.folders, folderId.value))

const browserSourceId = computed(() =>
  group.value?.kind === 'browser' ? group.value.browserSourceId : null
)

/** 当前目录属于浏览器收藏夹来源 */
const showBrowserSync = computed(() => !!browserSourceId.value)

const browserSourceAvailable = computed(() => {
  const id = browserSourceId.value
  return id ? store.isBrowserSourceAvailable(id) : false
})

const browserSyncActive = computed(
  () => showBrowserSync.value && browserSourceAvailable.value
)

const headerSubtitle = computed(() => {
  if (isRecycleBin.value) return '回收站'
  const folder = store.selectedFolder
  if (
    folder &&
    !isBrowserRootFolderId(folder.id) &&
    folder.id !== LOCAL_COLLECTIONS_ROOT_ID
  ) {
    return folder.name
  }
  if (folder?.id === LOCAL_COLLECTIONS_ROOT_ID) return '收藏夹'
  return folder?.name ?? '收藏夹'
})

const displayBookmarks = computed(() => {
  const base = store.isGlobalSearch ? store.globalSearchMatches : store.bookmarks
  if (hideUnreachable.value) {
    return base.filter((b) => !b.unreachable)
  }
  return base
})

const filteredBookmarks = computed(() =>
  sortBookmarksForDisplay(displayBookmarks.value, sortMode.value)
)

const listCountLabel = computed(() => {
  const n = filteredBookmarks.value.length
  if (!store.isGlobalSearch) return `${n} 条链接`
  return `全局 ${n} 条匹配`
})

function readViewMode(): WwViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'card' ? 'card' : 'list'
  } catch {
    return 'list'
  }
}

watch(viewMode, (mode) => {
  try {
    localStorage.setItem(VIEW_KEY, mode)
  } catch {
    /* ignore */
  }
})

async function persistSortOrderForMode(mode: LinksSortMode) {
  writeLinksSortMode(mode)
  if (store.isGlobalSearch || isRecycleBin.value) return
  const sorted = sortBookmarksForDisplay(store.bookmarks, mode)
  await store.persistBookmarkOrder(
    folderId.value,
    sorted.map((b) => b.id)
  )
}

watch(sortMode, async (mode, prev) => {
  if (prev === undefined) return
  if (mode === prev) return
  await persistSortOrderForMode(mode)
})

async function reloadBookmarks() {
  await store.loadBookmarks(folderId.value, { includeDeleted: isRecycleBin.value })
}

function navigateFolder(id: string) {
  hideUnreachable.value = false
  writeLastLinksFolderId(id)
  void router.push({ name: 'library-links', params: { folderId: id } })
}

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
  navigateFolder,
  reloadBookmarks
})

type SyncToastMode = 'none' | 'manual' | 'watch'

function browserUnavailableDetail(): string {
  const id = browserSourceId.value
  const name = id ? (store.browserSourceStatus(id)?.displayName ?? '该浏览器') : '该浏览器'
  return `未在本机找到 ${name} 的书签数据，请先安装并使用过书签功能`
}

async function runSyncFromBrowser(toastMode: SyncToastMode = 'none') {
  try {
    if (!browserSourceId.value) return
    if (!store.isBrowserSourceAvailable(browserSourceId.value)) {
      if (toastMode !== 'none') {
        toast.add({
          severity: 'warn',
          summary: '无法同步',
          detail: browserUnavailableDetail(),
          life: 5000
        })
      }
      return
    }
    const result = await store.syncFromBrowser(browserSourceId.value)
    if (toastMode === 'manual') {
      toast.add({
        severity: 'success',
        summary: '已同步到软件',
        detail: formatLinksSyncDetail(result),
        life: 4000
      })
    } else if (toastMode === 'watch' && hasLinksSyncChanges(result)) {
      toast.add({
        severity: 'info',
        summary: '收藏已更新',
        detail: formatLinksSyncDetail(result),
        life: 4000
      })
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: '同步失败',
      detail: e instanceof Error ? e.message : '无法读取外部收藏夹',
      life: 5000
    })
  }
}

async function runSyncToBrowser() {
  try {
    if (!browserSourceId.value) return
    if (!store.isBrowserSourceAvailable(browserSourceId.value)) {
      toast.add({
        severity: 'warn',
        summary: '无法写回',
        detail: browserUnavailableDetail(),
        life: 5000
      })
      return
    }
    const result = await store.syncToBrowser(browserSourceId.value)
    toast.add({
      severity: 'success',
      summary: '已写回浏览器',
      detail: formatLinksSyncDetail(result),
      life: 4000
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: '写回失败',
      detail: e instanceof Error ? e.message : '无法写入浏览器收藏夹',
      life: 5000
    })
  }
}

const { liveSyncEnabled } = useLinksLiveSync(
  () => runSyncFromBrowser('watch'),
  browserSyncActive,
  browserSourceId
)

function copyLink(url: string) {
  void popTip.copyLink(url)
}

async function openLink(url: string) {
  if (!url) return
  await window.wanwu.shell.openExternal(url)
}

function onAdd() {
  if (!canAddBookmark.value) {
    toast.add({
      severity: 'warn',
      summary: '无法添加',
      detail: '请先在左侧选择文件夹（回收站不可添加）',
      life: 3000
    })
    return
  }
  formMode.value = 'create'
  editTarget.value = null
  formVisible.value = true
}

function onCreateFolder() {
  if (group.value?.kind !== 'local') return
  const parentId =
    folderId.value === LOCAL_COLLECTIONS_ROOT_ID ?
      LOCAL_COLLECTIONS_ROOT_ID
    : folderId.value
  openCreateFolderDialog(parentId)
}

async function softDelete(bookmark: LinkBookmark) {
  if (isRecycleBin.value) {
    await window.wanwu.links.permanentDeleteBookmark(bookmark.id)
  } else {
    await window.wanwu.links.softDeleteBookmark(bookmark.id)
  }
  await reloadBookmarks()
  await store.refreshRecycleBinCount()
  if (store.isGlobalSearch) await store.loadAllBookmarks()
}

async function restore(bookmark: LinkBookmark) {
  await window.wanwu.links.restoreBookmark(bookmark.id)
  await store.loadFolders()
  await store.loadBookmarks(LINKS_RECYCLE_BIN_ID, { includeDeleted: true })
  await store.refreshRecycleBinCount()
  toast.add({ severity: 'success', summary: '已恢复', life: 2000 })
}

const probeLoaderLabel = computed(() => {
  if (!probingLinks.value) return ''
  return '正在检查链接…'
})

const probeLoaderSublabel = computed(() => {
  const p = probeProgress.value
  if (!p?.total) return ''
  return `已完成 ${p.done} / ${p.total} 条`
})

async function collectProbeTargetIds(): Promise<string[]> {
  if (store.isGlobalSearch) {
    if (!store.allBookmarks.length) await store.loadAllBookmarks()
    return store.globalSearchMatches.filter((b) => !b.deleted).map((b) => b.id)
  }
  await store.loadAllBookmarks()
  return bookmarkIdsInFolderScope(store.folders, folderId.value, store.allBookmarks)
}

async function filterUnreachable() {
  const ids = await collectProbeTargetIds()
  if (!ids.length) {
    toast.add({ severity: 'info', summary: '当前分类下没有可检查的链接', life: 2500 })
    return
  }

  probingLinks.value = true
  probeProgress.value = { done: 0, total: ids.length }
  try {
    const summary = await window.wanwu.links.probeUnreachable(ids, (p) => {
      probeProgress.value = p
    })
    await reloadBookmarks()
    if (store.isGlobalSearch) await store.loadAllBookmarks()
    hideUnreachable.value = summary.invalidCount > 0
    toast.add({
      severity: summary.invalidCount > 0 ? 'warn' : 'success',
      summary: '检查完成',
      detail:
        summary.invalidCount > 0 ?
          `${formatLinksProbeDetail(summary)}，已隐藏无效项`
        : formatLinksProbeDetail(summary),
      life: 4500
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: '检查失败',
      detail: e instanceof Error ? e.message : '无法完成链接检查',
      life: 5000
    })
  } finally {
    probingLinks.value = false
    probeProgress.value = null
  }
}

function onEdit(bookmark: LinkBookmark) {
  formMode.value = 'edit'
  editTarget.value = bookmark
  formVisible.value = true
}

async function onFormSave(payload: { id?: string; title: string; url: string }) {
  try {
    if (payload.id) {
      const prev = editTarget.value
      await window.wanwu.links.updateBookmark({
        id: payload.id,
        title: payload.title,
        url: payload.url
      })
      if (prev?.url && prev.url !== payload.url) {
        invalidateFaviconForUrl(prev.url)
        invalidateFaviconForUrl(payload.url)
      }
    } else {
      await window.wanwu.links.createBookmark({
        folderId: folderId.value,
        title: payload.title,
        url: payload.url
      })
    }
    await reloadBookmarks()
    if (store.isGlobalSearch) await store.loadAllBookmarks()
    toast.add({
      severity: 'success',
      summary: payload.id ? '已保存' : '已添加',
      life: 2000
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: payload.id ? '保存失败' : '添加失败',
      detail: e instanceof Error ? e.message : '请检查标题与链接地址',
      life: 4000
    })
  }
}

onMounted(async () => {
  const id = folderId.value
  if (route.params.folderId !== id) {
    await router.replace({ name: 'library-links', params: { folderId: id } })
  }
  writeLastLinksFolderId(id)
  await store.loadBrowserSources()
  await store.loadFolders()
  if (browserSyncActive.value) {
    await runSyncFromBrowser('none')
  }
  await reloadBookmarks()
})

watch(folderId, async (id) => {
  hideUnreachable.value = false
  writeLastLinksFolderId(id)
  await reloadBookmarks()
})
</script>

<template>
  <div class="ww-links-view flex min-h-0 flex-1 flex-col overflow-hidden">
    <ModulePageLayout>
      <template #header>
        <PageHeader title="链接" :subtitle="headerSubtitle" stacked-titles>
          <template #actions>
            <LinksToolbar
              v-model:search="search"
              v-model:view-mode="viewMode"
              v-model:live-sync="liveSyncEnabled"
              v-model:sort-mode="sortMode"
              :syncing="store.syncing"
              :checking-links="probingLinks"
              :can-create-folder="canCreateFolder"
              :show-browser-sync="showBrowserSync"
              :browser-sync-available="browserSourceAvailable"
              @sync-from-browser="runSyncFromBrowser('manual')"
              @sync-to-browser="runSyncToBrowser"
              @add="onAdd"
              @create-folder="onCreateFolder"
              @filter-unreachable="filterUnreachable"
            />
          </template>
        </PageHeader>
      </template>

      <div class="ww-links-workspace flex min-h-0 flex-1 gap-3 overflow-hidden">
        <aside
          v-if="group && group.kind !== 'recycle'"
          class="ww-links-workspace__nav ww-scrollbar shrink-0 overflow-y-auto"
          aria-label="收藏夹目录"
        >
          <LinksGroupFolderTree
            :folders="store.folders"
            :folder-id="folderId"
            :matching-folder-ids="store.isGlobalSearch ? store.matchingFolderIds : null"
            @select-folder="navigateFolder"
            @create-folder="openCreateFolderDialog"
            @delete-folder="openDeleteFolderDialog"
          />
        </aside>

        <section class="ww-links-workspace__main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Transition name="fade-slide" mode="out-in">
            <div
              :key="`${folderId}:${store.searchQuery}`"
              class="ww-links-panel flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div
                v-if="store.loading || store.globalSearchLoading"
                class="text-sm text-ww-ink-muted"
              >
                加载中…
              </div>

              <EmptyState
                v-else-if="filteredBookmarks.length === 0"
                :title="store.isGlobalSearch ? '无匹配链接' : isRecycleBin ? '回收站为空' : '暂无链接'"
                :description="
                  store.isGlobalSearch ?
                    '尝试更换关键词，或清空搜索查看当前文件夹。'
                  : isRecycleBin ?
                    '已删除的链接会显示在这里，可恢复或彻底删除。'
                  : group?.kind === 'local' ?
                    '可新建目录或添加链接。'
                  : '当前文件夹下没有链接，可切换左侧目录或从浏览器同步收藏夹。'
                "
              />

              <div v-else class="ww-library-grid-wrap ww-links-grid-wrap">
                <p class="ww-library-list-meta shrink-0">{{ listCountLabel }}</p>

                <div class="ww-links-scroll-body ww-scrollbar min-h-0 flex-1">
                  <LinkBookmarkList
                    v-if="viewMode === 'list'"
                    :bookmarks="filteredBookmarks"
                    :is-recycle-bin="isRecycleBin"
                    @copy="copyLink"
                    @open="openLink"
                    @edit="onEdit"
                    @restore="restore"
                    @delete="softDelete"
                  />
                  <div v-else class="ww-library-grid ww-links-card-grid">
                    <LinkBookmarkCard
                      v-for="link in filteredBookmarks"
                      :key="link.id"
                      :bookmark="link"
                      :is-recycle-bin="isRecycleBin"
                      @copy="copyLink"
                      @open="openLink"
                      @edit="onEdit"
                      @restore="restore"
                      @delete="softDelete"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </section>
      </div>
    </ModulePageLayout>

    <LinkBookmarkFormDialog
      v-model:visible="formVisible"
      :mode="formMode"
      :bookmark="editTarget"
      @save="onFormSave"
    />

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

    <WwBlockingLoader
      :visible="probingLinks"
      :label="probeLoaderLabel"
      :sublabel="probeLoaderSublabel"
    />
  </div>
</template>
<style>
@import '../../core/styles/library-shared.css';

.ww-links-workspace {
  min-height: 12rem;
}

.ww-links-workspace__nav {
  width: 14rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ww-links-panel {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ww-links-grid-wrap {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ww-links-scroll-body {
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 0.5rem;
}

.ww-links-bookmark-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ww-links-card-grid {
  grid-template-columns: repeat(auto-fill, minmax(16.5rem, 1fr));
}
</style>
