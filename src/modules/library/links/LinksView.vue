<script setup lang="ts">
defineOptions({ name: 'LinksView' })

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { usePopTip } from '@shared/composables/usePopTip'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import LinksToolbar from '@features/library/links/LinksToolbar.vue'
import LinksGroupFolderTree from '@features/library/links/LinksGroupFolderTree.vue'
import LinkBookmarkList from '@features/library/links/LinkBookmarkList.vue'
import LinkBookmarkCard from '@features/library/links/LinkBookmarkCard.vue'
import LinkBookmarkEditDialog from '@features/library/links/LinkBookmarkEditDialog.vue'
import { invalidateFaviconForUrl } from '@features/library/links/useLinkFavicon'
import { useLinksLiveSync } from '@features/library/links/useLinksLiveSync'
import {
  formatLinksSyncDetail,
  hasLinksSyncChanges
} from '@features/library/links/linksSyncToast'
import { resolveLinksGroupRoot } from '@features/library/links/linksFolderTree'
import {
  EDGE_ROOT_FOLDER_ID,
  LINKS_RECYCLE_BIN_ID,
  useLinksStore
} from '@shared/stores/links'
import type { LinkBookmark } from '@shared/types/links'
import type { WwViewMode } from '@shared/components/WwViewModeToggle.vue'

const VIEW_KEY = 'wanwu:links:viewMode'
const SORT_KEY = 'wanwu:links:sortField'

type LinksSortField = 'title' | 'url' | 'sortOrder'

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
const sortField = ref<LinksSortField>(readSortField())
const hideUnreachable = ref(false)
const editVisible = ref(false)
const editTarget = ref<LinkBookmark | null>(null)

const folderId = computed(() => (route.params.folderId as string | undefined) ?? EDGE_ROOT_FOLDER_ID)
const isRecycleBin = computed(() => folderId.value === LINKS_RECYCLE_BIN_ID)

const group = computed(() => resolveLinksGroupRoot(store.folders, folderId.value))

const headerSubtitle = computed(() => {
  if (isRecycleBin.value) return '回收站'
  const folder = store.selectedFolder
  if (folder && folder.id !== EDGE_ROOT_FOLDER_ID) return folder.name
  return store.selectedFolder?.name ?? '收藏夹'
})

const displayBookmarks = computed(() => {
  const base = store.isGlobalSearch ? store.globalSearchMatches : store.bookmarks
  if (hideUnreachable.value) {
    return base.filter((b) => !b.unreachable)
  }
  return base
})

const filteredBookmarks = computed(() => [...displayBookmarks.value].sort(compareBookmarks))

const listCountLabel = computed(() => {
  const n = filteredBookmarks.value.length
  if (!store.isGlobalSearch) return `${n} 条链接`
  return `全局 ${n} 条匹配`
})

function readViewMode(): WwViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'card'
  } catch {
    return 'list'
  }
}

function readSortField(): LinksSortField {
  try {
    const v = localStorage.getItem(SORT_KEY)
    if (v === 'title' || v === 'url' || v === 'sortOrder') return v
  } catch {
    /* ignore */
  }
  return 'sortOrder'
}

watch(viewMode, (mode) => {
  try {
    localStorage.setItem(VIEW_KEY, mode)
  } catch {
    /* ignore */
  }
})

function compareBookmarks(a: LinkBookmark, b: LinkBookmark): number {
  if (sortField.value === 'title') {
    return a.title.localeCompare(b.title, 'zh-CN', { sensitivity: 'base' })
  }
  if (sortField.value === 'url') {
    return a.url.localeCompare(b.url, 'zh-CN')
  }
  return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'zh-CN')
}

async function reloadBookmarks() {
  await store.loadBookmarks(folderId.value, { includeDeleted: isRecycleBin.value })
}

type SyncToastMode = 'none' | 'manual' | 'watch'

async function runSync(toastMode: SyncToastMode = 'none') {
  try {
    const result = await store.syncFromBrowser()
    if (toastMode === 'manual') {
      toast.add({
        severity: 'success',
        summary: '同步完成',
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

const { liveSyncEnabled } = useLinksLiveSync(() => runSync('watch'))

function copyLink(url: string) {
  void popTip.copyLink(url)
}

async function openLink(url: string) {
  if (!url) return
  await window.wanwu.shell.openExternal(url)
}

async function onAdd() {
  const title = window.prompt('链接标题')
  if (!title?.trim()) return
  const url = window.prompt('链接地址')
  if (!url?.trim()) return
  await window.wanwu.links.createBookmark({
    folderId: folderId.value,
    title: title.trim(),
    url: url.trim()
  })
  await reloadBookmarks()
}

async function softDelete(bookmark: LinkBookmark) {
  if (isRecycleBin.value) {
    await window.wanwu.links.permanentDeleteBookmark(bookmark.id)
  } else {
    await window.wanwu.links.softDeleteBookmark(bookmark.id)
  }
  await reloadBookmarks()
}

async function restore(bookmark: LinkBookmark) {
  await window.wanwu.links.restoreBookmark(bookmark.id)
  await store.loadBookmarks(LINKS_RECYCLE_BIN_ID, { includeDeleted: true })
}

async function filterUnreachable() {
  const source = store.isGlobalSearch ? store.globalSearchMatches : store.bookmarks
  const ids = source.filter((b) => !b.deleted).map((b) => b.id)
  if (!ids.length) return
  const map = await window.wanwu.links.probeUnreachable(ids)
  const patch = (list: typeof store.bookmarks) =>
    list.map((b) => ({
      ...b,
      unreachable: map[b.id] ?? b.unreachable
    }))
  store.bookmarks = patch(store.bookmarks)
  if (store.isGlobalSearch) {
    store.allBookmarks = patch(store.allBookmarks)
  }
  hideUnreachable.value = true
}

function onSort() {
  const order: LinksSortField[] = ['sortOrder', 'title', 'url']
  const idx = order.indexOf(sortField.value)
  sortField.value = order[(idx + 1) % order.length]!
  try {
    localStorage.setItem(SORT_KEY, sortField.value)
  } catch {
    /* ignore */
  }
  toast.add({
    severity: 'info',
    summary: '排序',
    detail:
      sortField.value === 'title' ? '按标题'
      : sortField.value === 'url' ? '按地址'
      : '按原始顺序',
    life: 2000
  })
}

function onBatch() {
  toast.add({
    severity: 'info',
    summary: '批量操作',
    detail: '批量选择与操作即将推出',
    life: 2500
  })
}

function onEdit(bookmark: LinkBookmark) {
  editTarget.value = bookmark
  editVisible.value = true
}

async function onEditSave(payload: { id: string; title: string; url: string }) {
  const prev = editTarget.value
  try {
    await window.wanwu.links.updateBookmark(payload)
    if (prev?.url && prev.url !== payload.url) {
      invalidateFaviconForUrl(prev.url)
      invalidateFaviconForUrl(payload.url)
    }
    await reloadBookmarks()
    toast.add({ severity: 'success', summary: '已保存', life: 2000 })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: e instanceof Error ? e.message : '无法更新链接',
      life: 4000
    })
  }
}

function navigateFolder(id: string) {
  void router.push({ name: 'library-links', params: { folderId: id } })
}

onMounted(async () => {
  await store.loadFolders()
  await runSync('none')
  await reloadBookmarks()
})

watch(folderId, async () => {
  await reloadBookmarks()
})
</script>

<template>
  <div class="ww-links-view flex h-full min-h-0 flex-col overflow-hidden">
    <ModulePageLayout>
      <template #header>
        <PageHeader title="链接" :subtitle="headerSubtitle" stacked-titles>
          <template #actions>
            <LinksToolbar
              v-model:search="search"
              v-model:view-mode="viewMode"
              v-model:live-sync="liveSyncEnabled"
              :syncing="store.syncing"
              @sync="runSync('manual')"
              @add="onAdd"
              @filter-unreachable="filterUnreachable"
              @sort="onSort"
              @batch="onBatch"
            />
          </template>
        </PageHeader>
      </template>

      <div class="ww-links-workspace flex min-h-0 flex-1 gap-3 overflow-hidden">
        <aside
          v-if="group?.kind === 'edge'"
          class="ww-links-workspace__nav ww-scrollbar shrink-0 overflow-y-auto"
          aria-label="收藏夹目录"
        >
          <LinksGroupFolderTree
            :folders="store.folders"
            :folder-id="folderId"
            :matching-folder-ids="store.isGlobalSearch ? store.matchingFolderIds : null"
            @select-folder="navigateFolder"
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
                    '已删除的链接会显示在这里。'
                  : '当前文件夹下没有链接，可切换左侧目录或同步收藏夹。'
                "
              />

              <div v-else class="ww-library-grid-wrap ww-links-grid-wrap">
                <p class="ww-library-list-meta">{{ listCountLabel }}</p>

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
          </Transition>
        </section>
      </div>
    </ModulePageLayout>

    <LinkBookmarkEditDialog
      v-model:visible="editVisible"
      :bookmark="editTarget"
      @save="onEditSave"
    />

  </div>
</template>
<style>
.ww-links-workspace {
  min-height: 12rem;
}

.ww-links-workspace__nav {
  width: 11.5rem;
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

.ww-links-card-grid {
  grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr));
}

.ww-library-grid-wrap {
  padding-bottom: 1.5rem;
}

.ww-library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

@keyframes ww-fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ww-library-grid.ww-stagger-children > * {
  animation: ww-fade-up var(--ww-duration-slow) var(--ww-ease-out-slow) backwards;
  animation-delay: calc(var(--ww-stagger, 0) * 48ms);
}

@media (prefers-reduced-motion: reduce) {
  .ww-library-grid.ww-stagger-children > * { animation: none; }
}
</style>
