<script setup lang="ts">
defineOptions({ name: 'LinksView' })

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tree from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import LinksToolbar, { type LinksViewMode } from '@features/library/links/LinksToolbar.vue'
import { catalogToTreeNodes } from '@library/types/catalog'
import {
  EDGE_ROOT_FOLDER_ID,
  LINKS_RECYCLE_BIN_ID,
  useLinksStore
} from '@shared/stores/links'
import type { LinkBookmark } from '@shared/types/links'

const route = useRoute()
const router = useRouter()
const store = useLinksStore()
const toast = useToast()

const folderExpandedKeys = ref<Record<string, boolean>>({})
const folderSelectionKeys = ref<Record<string, boolean>>({})
const search = ref('')
const viewMode = ref<LinksViewMode>('list')
const hideUnreachable = ref(false)

const folderId = computed(() => (route.params.folderId as string | undefined) ?? EDGE_ROOT_FOLDER_ID)

const folderTreeNodes = computed<TreeNode[]>(() =>
  catalogToTreeNodes(store.folderTree, (node) => `fld:${node.id}`)
)

const filteredBookmarks = computed(() => {
  let list = store.bookmarks
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)
    )
  }
  if (hideUnreachable.value) {
    list = list.filter((b) => !b.unreachable)
  }
  return list
})

const isRecycleBin = computed(() => folderId.value === LINKS_RECYCLE_BIN_ID)

const headerSubtitle = computed(() => store.selectedFolder?.name ?? '链接')

function syncFolderSelection() {
  const id = folderId.value
  folderSelectionKeys.value = { [`fld:${id}`]: true }
  folderExpandedKeys.value = { [`fld:${id}`]: true }
}

function onFolderSelect(node: TreeNode) {
  const key = String(node.key)
  if (!key.startsWith('fld:')) return
  const id = key.slice(4)
  void router.push({ name: 'library-links', params: { folderId: id } })
}

async function openUrl(url: string) {
  if (!url) return
  await window.wanwu.shell.openExternal(url)
}

async function onSync() {
  try {
    const result = await window.wanwu.links.sync()
    await store.loadFolders()
    if (folderId.value) {
      await store.loadBookmarks(folderId.value, { includeDeleted: isRecycleBin.value })
    }
    toast.add({
      severity: 'success',
      summary: '同步完成',
      detail: `新增 ${result.added}，更新 ${result.updated}，保留删除 ${result.skippedDeleted}`,
      life: 4000
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: '同步失败',
      detail: e instanceof Error ? e.message : '无法读取 Edge 收藏',
      life: 5000
    })
  }
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
  await store.loadBookmarks(folderId.value)
}

async function softDelete(bookmark: LinkBookmark) {
  if (isRecycleBin.value) {
    await window.wanwu.links.permanentDeleteBookmark(bookmark.id)
  } else {
    await window.wanwu.links.softDeleteBookmark(bookmark.id)
  }
  await store.loadBookmarks(folderId.value, { includeDeleted: isRecycleBin.value })
}

async function restore(bookmark: LinkBookmark) {
  await window.wanwu.links.restoreBookmark(bookmark.id)
  await store.loadBookmarks(LINKS_RECYCLE_BIN_ID, { includeDeleted: true })
}

async function filterUnreachable() {
  const ids = store.bookmarks.filter((b) => !b.deleted).map((b) => b.id)
  if (!ids.length) return
  const map = await window.wanwu.links.probeUnreachable(ids)
  store.bookmarks = store.bookmarks.map((b) => ({
    ...b,
    unreachable: map[b.id] ?? b.unreachable
  }))
  hideUnreachable.value = true
}

onMounted(async () => {
  await store.loadFolders()
  syncFolderSelection()
  await store.loadBookmarks(folderId.value, { includeDeleted: isRecycleBin.value })
})

watch(folderId, async (id) => {
  syncFolderSelection()
  await store.loadBookmarks(id, { includeDeleted: id === LINKS_RECYCLE_BIN_ID })
})
</script>

<template>
  <div class="ww-links-view flex h-full min-h-0 flex-col overflow-hidden">
    <ModulePageLayout>
      <template #header>
        <PageHeader title="链接" :subtitle="headerSubtitle">
          <template #actions>
            <LinksToolbar
              v-model:search="search"
              v-model:view-mode="viewMode"
              :syncing="store.syncing"
              @sync="onSync"
              @add="onAdd"
              @filter-unreachable="filterUnreachable"
            />
          </template>
        </PageHeader>
      </template>

      <div class="ww-links-split flex min-h-0 flex-1 gap-3 overflow-hidden">
        <aside
          class="ww-links-folders ww-scrollbar flex w-56 shrink-0 flex-col overflow-y-auto rounded-xl border border-ww-border/60 bg-ww-panel/40 p-2"
          aria-label="链接文件夹"
        >
          <Tree
            v-model:expanded-keys="folderExpandedKeys"
            v-model:selection-keys="folderSelectionKeys"
            :value="folderTreeNodes"
            selection-mode="single"
            class="ww-library-tree w-full border-0 bg-transparent p-0"
            @node-select="onFolderSelect"
          />
        </aside>

        <section class="ww-links-content flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div v-if="store.loading" class="text-sm text-ww-ink-muted">加载中…</div>

          <EmptyState
            v-else-if="filteredBookmarks.length === 0"
            :title="isRecycleBin ? '回收站为空' : '暂无链接'"
            :description="
              isRecycleBin ?
                '已删除的链接会显示在这里。'
              : '点击同步从 Microsoft Edge 导入收藏，或手动新增。'
            "
          />

          <ul
            v-else-if="viewMode === 'list'"
            class="ww-links-list ww-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1"
          >
            <li
              v-for="link in filteredBookmarks"
              :key="link.id"
              class="ww-links-list__row flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-ww-panel"
              :class="{ 'ww-links-list__row--deleted': link.deleted }"
            >
              <button
                type="button"
                class="min-w-0 flex-1 text-left"
                @click="openUrl(link.url)"
              >
                <span class="block truncate font-medium">{{ link.title }}</span>
                <span class="block truncate text-xs text-ww-ink-muted">{{ link.url }}</span>
              </button>
              <div class="flex shrink-0 gap-1">
                <Button
                  v-if="isRecycleBin"
                  label="恢复"
                  size="small"
                  text
                  @click="restore(link)"
                />
                <Button
                  :label="isRecycleBin ? '彻底删除' : '删除'"
                  size="small"
                  severity="secondary"
                  text
                  @click="softDelete(link)"
                />
              </div>
            </li>
          </ul>

          <div
            v-else
            class="ww-links-grid ww-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3"
          >
            <article
              v-for="link in filteredBookmarks"
              :key="link.id"
              class="ww-links-card flex flex-col rounded-xl border border-ww-border/50 bg-ww-panel/60 p-4 transition-shadow hover:shadow-md"
              :class="{ 'ww-links-card--deleted': link.deleted }"
            >
              <button type="button" class="text-left" @click="openUrl(link.url)">
                <h3 class="truncate font-semibold">{{ link.title }}</h3>
                <p class="mt-1 line-clamp-2 text-xs text-ww-ink-muted">{{ link.url }}</p>
              </button>
              <div class="mt-3 flex gap-2">
                <Button
                  v-if="isRecycleBin"
                  label="恢复"
                  size="small"
                  outlined
                  @click="restore(link)"
                />
                <Button
                  :label="isRecycleBin ? '彻底删除' : '删除'"
                  size="small"
                  severity="secondary"
                  outlined
                  @click="softDelete(link)"
                />
              </div>
            </article>
          </div>
        </section>
      </div>
    </ModulePageLayout>
  </div>
</template>
