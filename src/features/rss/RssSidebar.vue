<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import Tree from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import type { TreeNodeDropEvent } from 'primevue/tree'
import ContextMenu from 'primevue/contextmenu'
import Badge from 'primevue/badge'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwMenuItem } from '@shared/types/menu'
import { useRssStore } from '@shared/stores/rss'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import {
  RSS_GROUP_TECH_ID,
  RSS_RECYCLE_GROUP_ID,
  type RssFeed,
  type RssGroup
} from '@shared/types/rss'
import RssFeedDialog from '@features/rss/RssFeedDialog.vue'
import RssMoveDialog from '@features/rss/RssMoveDialog.vue'
import RssGroupDialog from '@features/rss/RssGroupDialog.vue'
import RssFeedIcon from '@features/rss/RssFeedIcon.vue'

type RssNodeData =
  | { kind: 'group'; groupId: string; group: RssGroup }
  | { kind: 'feed'; feedId: string; feed: RssFeed }
  | { kind: 'recycle-feed'; feedId: string; feed: RssFeed }

const route = useRoute()
const router = useRouter()
const rssStore = useRssStore()
const { sidebarGroups, recycleFeeds } = storeToRefs(rssStore)
const toast = useWanwuToast()
const confirm = useWanwuConfirm()

const expandedKeys = ref<Record<string, boolean>>({})
const selectionKeys = ref<Record<string, boolean>>({})
const contextMenu = ref()
const menuItems = ref<WwMenuItem[]>([])
const feedDialogVisible = ref(false)
const moveDialogVisible = ref(false)
const editingFeed = ref<RssFeed | null>(null)
const moveFeedTarget = ref<RssFeed | null>(null)
const pendingGroupId = ref<string | undefined>()

const groupDialogVisible = ref(false)
const groupDialogTitle = ref('新建分组')
const groupDialogInitialName = ref('')
const groupDialogConfirmLabel = ref('创建')
const renamingGroup = ref<RssGroup | null>(null)
const treeVersion = ref(0)

const recycleGroup = computed(() => rssStore.groups.find((g) => g.isRecycleBin))

const rssTree = computed<TreeNode[]>(() => {
  const nodes: TreeNode[] = sidebarGroups.value.map((group) => ({
    key: `group:${group.id}`,
    label: group.name,
    selectable: false,
    draggable: false,
    droppable: true,
    leaf: false,
    data: { kind: 'group', groupId: group.id, group } satisfies RssNodeData,
    children: rssStore.feedsInGroup(group.id).map((feed) => feedNode(feed))
  }))

  const recycle = recycleGroup.value
  if (recycle) {
    nodes.push({
      key: `group:${recycle.id}`,
      label: recycle.name,
      selectable: false,
      draggable: false,
      droppable: false,
      data: { kind: 'group', groupId: recycle.id, group: recycle } satisfies RssNodeData,
      leaf: false,
      children: recycleFeeds.value.map((feed) => ({
        key: `recycle:${feed.id}`,
        label: feed.title,
        leaf: true,
        selectable: false,
        draggable: false,
        data: { kind: 'recycle-feed', feedId: feed.id, feed } satisfies RssNodeData
      }))
    })
  }

  return nodes
})

function feedNode(feed: RssFeed): TreeNode {
  return {
    key: feed.id,
    label: feed.title,
    leaf: true,
    draggable: true,
    data: { kind: 'feed', feedId: feed.id, feed } satisfies RssNodeData
  }
}

function syncExpanded() {
  const next: Record<string, boolean> = { ...expandedKeys.value }
  for (const g of rssStore.groups) {
    const key = `group:${g.id}`
    if (next[key] === undefined) {
      next[key] = !g.isRecycleBin
    }
  }
  expandedKeys.value = next
}

function syncSelection() {
  const feedId = route.params.feedId as string | undefined
  selectionKeys.value = feedId ? { [feedId]: true } : {}
}

let rssLoaded = false

async function ensureRssLoaded() {
  if (rssLoaded) return
  await rssStore.loadAll()
  rssLoaded = true
  syncExpanded()
}

onMounted(async () => {
  if (route.meta.module === 'rss') {
    await ensureRssLoaded()
    syncExpanded()
    syncSelection()
    void rssStore.startAccessibilityProbe()
  }
})

onUnmounted(() => {
  rssStore.stopAccessibilityProbe()
})

watch(
  () => route.meta.module,
  async (m) => {
    if (m === 'rss') {
      await ensureRssLoaded()
      syncExpanded()
      syncSelection()
      void rssStore.startAccessibilityProbe()
    } else {
      rssStore.stopAccessibilityProbe()
    }
  }
)

watch(() => rssStore.groups.length, syncExpanded)
watch(() => route.params.feedId, syncSelection)

watch(
  () => [route.meta.module, rssStore.activeFeeds.length],
  () => {
    if (route.meta.module !== 'rss') return
    const feedId = route.params.feedId as string | undefined
    const active = rssStore.activeFeeds
    if (!feedId && active.length) {
      router.replace({ name: 'rss', params: { feedId: active[0].id } })
    }
  },
  { immediate: true }
)

function nodeData(node: TreeNode): RssNodeData | undefined {
  return node.data as RssNodeData | undefined
}

function groupFromNode(node: TreeNode) {
  const data = nodeData(node)
  return data?.kind === 'group' ? data : undefined
}

function feedFromNode(node: TreeNode) {
  const data = nodeData(node)
  return data?.kind === 'feed' ? data : undefined
}

function recycleFeedFromNode(node: TreeNode) {
  const data = nodeData(node)
  return data?.kind === 'recycle-feed' ? data : undefined
}

function groupFeedCount(groupId: string): number {
  if (groupId === RSS_RECYCLE_GROUP_ID) return rssStore.recycleFeeds.length
  return rssStore.feedsInGroup(groupId).length
}

async function selectFeed(feedId: string) {
  if (route.params.feedId === feedId) {
    rssStore.cancelPendingRefresh()
    const ok = await rssStore.refreshFeed(feedId)
    if (!ok && rssStore.error) toast.error(rssStore.error)
    return
  }
  rssStore.cancelPendingRefresh()
  router.push({ name: 'rss', params: { feedId } })
}

function onNodeSelect(node: TreeNode) {
  const data = nodeData(node)
  if (data?.kind === 'feed') void selectFeed(data.feedId)
}

async function onNodeDrop(event: TreeNodeDropEvent) {
  const drag = nodeData(event.dragNode)
  const drop = nodeData(event.dropNode)
  if (drag?.kind !== 'feed' || drop?.kind !== 'group') return
  if (event.dropPosition !== 0) return
  if (drop.groupId === RSS_RECYCLE_GROUP_ID) return
  await rssStore.moveFeed(drag.feedId, drop.groupId)
}

function openAddFeed(groupId?: string) {
  editingFeed.value = null
  feedDialogVisible.value = true
  pendingGroupId.value = groupId
}

async function onSaveFeed(payload: {
  id?: string
  title?: string
  url?: string
  groupId?: string
  display?: RssFeed['display']
}) {
  try {
    if (payload.id && payload.title === undefined) {
      await rssStore.updateFeed({
        id: payload.id,
        groupId: payload.groupId,
        display: payload.display
      })
      toast.success('已更新订阅')
      return
    }
    if (payload.id && payload.title !== undefined) {
      await rssStore.updateFeed({
        id: payload.id,
        title: payload.title,
        url: payload.url,
        groupId: payload.groupId,
        display: payload.display
      })
      toast.success('已更新订阅')
      return
    }
    if (payload.title && payload.url) {
      const feed = await rssStore.createFeed({
        title: payload.title,
        url: payload.url,
        groupId: payload.groupId ?? pendingGroupId.value ?? RSS_GROUP_TECH_ID,
        display: payload.display
      })
      toast.success('已添加订阅')
      router.push({ name: 'rss', params: { feedId: feed.id } })
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  }
}

function openCreateGroup() {
  renamingGroup.value = null
  groupDialogTitle.value = '新建分组'
  groupDialogInitialName.value = ''
  groupDialogConfirmLabel.value = '创建'
  groupDialogVisible.value = true
}

function openRenameGroup(group: RssGroup) {
  renamingGroup.value = group
  groupDialogTitle.value = '重命名分组'
  groupDialogInitialName.value = group.name
  groupDialogConfirmLabel.value = '保存'
  groupDialogVisible.value = true
}

async function onSaveGroup(name: string) {
  try {
    if (renamingGroup.value) {
      if (name !== renamingGroup.value.name) {
        await rssStore.renameGroup(renamingGroup.value.id, name)
        toast.success('已重命名')
      }
    } else {
      const group = await rssStore.createGroup(name)
      syncExpanded()
      const groupKey = `group:${group.id}`
      expandedKeys.value = { ...expandedKeys.value, [groupKey]: true }
      treeVersion.value += 1
      toast.success('已创建分组')
    }
    groupDialogVisible.value = false
    renamingGroup.value = null
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  }
}

function onNodeContextMenu(event: Event, node: TreeNode) {
  const data = nodeData(node)
  if (!data) return
  if (data.kind === 'feed') showFeedMenu(event, data.feed)
  else if (data.kind === 'group' && !data.group.isRecycleBin) showGroupMenu(event, data.group)
  else if (data.kind === 'recycle-feed') showRecycleMenu(event, data.feed)
}

function showFeedMenu(event: Event, feed: RssFeed) {
  menuItems.value = [
    { label: '编辑订阅', wwIcon: 'pencil', command: () => openEditFeed(feed) },
    { label: '移至分组…', wwIcon: 'arrow-right', command: () => openMoveFeed(feed) },
    { label: '删除', wwIcon: 'trash-2', command: () => void softDelete(feed.id) }
  ]
  contextMenu.value.show(event)
}

function showGroupMenu(event: Event, group: RssGroup) {
  if (group.isSystem || group.isRecycleBin) return
  menuItems.value = [
    { label: '重命名', wwIcon: 'pencil', command: () => openRenameGroup(group) },
    { label: '删除分组', wwIcon: 'trash-2', command: () => void removeGroup(group.id) }
  ]
  contextMenu.value.show(event)
}

function showRecycleMenu(event: Event, feed: RssFeed) {
  menuItems.value = [
    { label: '还原', wwIcon: 'rotate-ccw', command: () => void restore(feed.id) },
    { label: '彻底删除', wwIcon: 'x', command: () => void permanentDelete(feed.id) }
  ]
  contextMenu.value.show(event)
}

function openEditFeed(feed: RssFeed) {
  editingFeed.value = feed
  feedDialogVisible.value = true
}

function openMoveFeed(feed: RssFeed) {
  moveFeedTarget.value = feed
  moveDialogVisible.value = true
}

async function onMoveFeed(groupId: string) {
  if (!moveFeedTarget.value) return
  await rssStore.moveFeed(moveFeedTarget.value.id, groupId)
  toast.success('已移动')
}

async function softDelete(feedId: string) {
  await rssStore.softDeleteFeed(feedId)
  if (route.params.feedId === feedId) {
    const next = rssStore.activeFeeds[0]
    if (next) router.replace({ name: 'rss', params: { feedId: next.id } })
    else router.replace({ name: 'rss' })
  }
  toast.success('已移入回收站')
}

async function restore(feedId: string) {
  await rssStore.restoreFeed(feedId)
  toast.success('已还原')
}

async function permanentDelete(feedId: string) {
  const ok = await confirm.ask({
    header: '彻底删除',
    message: '彻底删除后无法恢复，确定继续？',
    acceptLabel: '删除',
    danger: true
  })
  if (!ok) return
  await rssStore.permanentDeleteFeed(feedId)
  toast.success('已彻底删除')
}

async function emptyRecycle() {
  if (!rssStore.recycleFeeds.length) return
  const ok = await confirm.ask({
    header: '清空回收站',
    message: '清空后所有订阅将彻底删除，无法恢复。',
    acceptLabel: '清空',
    danger: true
  })
  if (!ok) return
  await rssStore.emptyRecycleBin()
  toast.success('回收站已清空')
}

async function removeGroup(groupId: string) {
  const ok = await confirm.ask({
    header: '删除分组',
    message: '删除后，该分组内的订阅将移至「科技资讯」分组。',
    acceptLabel: '删除',
    danger: true
  })
  if (!ok) return
  await rssStore.deleteGroup(groupId)
  syncExpanded()
  toast.success('已删除分组')
}
</script>

<template>
  <div class="ww-rss-sidebar flex min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 items-center gap-1 px-2 pb-2 pt-1">
      <WwButton
        icon="plus"
        label="订阅"
        size="small"
        severity="secondary"
        text
        class="!flex-1"
        @click="openAddFeed()"
      />
      <WwButton
        icon="folder-plus"
        size="small"
        severity="secondary"
        text
        v-tooltip.bottom="'新建分组'"
        aria-label="新建分组"
        @click="openCreateGroup"
      />
    </div>

    <div class="ww-scrollbar min-h-0 flex-1 overflow-y-auto px-1 pb-3">
      <Tree
        :key="treeVersion"
        v-model:expanded-keys="expandedKeys"
        v-model:selection-keys="selectionKeys"
        :value="rssTree"
        selection-mode="single"
        draggable-nodes
        droppable-nodes
        class="ww-library-tree ww-rss-tree w-full border-0 bg-transparent p-0"
        @node-select="onNodeSelect"
        @node-drop="onNodeDrop"
      >
        <template #nodeicon="{ node }">
          <RssFeedIcon
            v-if="feedFromNode(node)"
            :feed-url="feedFromNode(node)!.feed.url"
            :icon-url="feedFromNode(node)!.feed.iconUrl"
            size="sm"
          />
          <WwIcon
            v-else-if="groupFromNode(node)"
            :name="groupFromNode(node)!.group.isRecycleBin ? 'trash-2' : 'folder'"
            size="sm"
            class="ww-rss-folder-icon"
          />
          <WwIcon v-else-if="recycleFeedFromNode(node)" name="inbox" size="sm" class="ww-rss-folder-icon" />
        </template>

        <template #default="{ node }">
          <span
            class="ww-rss-tree-label"
            @contextmenu.prevent="onNodeContextMenu($event, node)"
          >
            <template v-if="groupFromNode(node)">
              <span class="ww-rss-tree-label__text truncate">{{ node.label }}</span>
              <Badge
                :value="groupFeedCount(groupFromNode(node)!.groupId)"
                severity="secondary"
                size="small"
                class="ww-rss-tree-badge"
              />
              <WwButton
                v-if="!groupFromNode(node)!.group.isRecycleBin"
                icon="plus"
                size="small"
                severity="secondary"
                text
                rounded
                class="ww-rss-tree-action !h-6 !w-6 shrink-0"
                aria-label="在此分组添加订阅"
                @click.stop="openAddFeed(groupFromNode(node)!.groupId)"
              />
              <WwButton
                v-else
                icon="trash-2"
                size="small"
                severity="secondary"
                text
                rounded
                class="ww-rss-tree-action !h-6 !w-6 shrink-0"
                :disabled="!rssStore.recycleFeeds.length"
                v-tooltip.bottom="'清空回收站'"
                aria-label="清空回收站"
                @click.stop="emptyRecycle"
              />
            </template>

            <template v-else-if="feedFromNode(node)">
              <span class="ww-rss-tree-label__text truncate">{{ node.label }}</span>
              <WwIcon
                v-if="feedFromNode(node)!.feed.accessWarning"
                name="circle-alert"
                size="sm"
                class="ww-rss-tree-warn shrink-0"
                v-tooltip.right="feedFromNode(node)!.feed.accessWarning"
                @click.stop
              />
              <WwIcon
                v-else-if="rssStore.isFeedProbing(feedFromNode(node)!.feedId)"
                name="loader"
                size="sm"
                spin
                class="ww-rss-tree-status shrink-0"
              />
            </template>

            <template v-else-if="recycleFeedFromNode(node)">
              <span class="ww-rss-tree-label__text truncate text-ww-ink-muted">{{ node.label }}</span>
              <span class="ww-rss-tree-recycle-actions">
                <WwButton
                  icon="rotate-ccw"
                  size="small"
                  severity="secondary"
                  text
                  rounded
                  class="ww-rss-tree-action !h-6 !w-6"
                  v-tooltip.top="'还原'"
                  aria-label="还原"
                  @click.stop="restore(recycleFeedFromNode(node)!.feedId)"
                />
                <WwButton
                  icon="x"
                  size="small"
                  severity="danger"
                  text
                  rounded
                  class="ww-rss-tree-action !h-6 !w-6"
                  v-tooltip.top="'彻底删除'"
                  aria-label="彻底删除"
                  @click.stop="permanentDelete(recycleFeedFromNode(node)!.feedId)"
                />
              </span>
            </template>

            <template v-else>
              <span class="ww-rss-tree-label__text truncate">{{ node.label }}</span>
            </template>
          </span>
        </template>

        <template #empty>
          <p class="px-2 py-6 text-center text-xs text-ww-ink-faint">暂无订阅</p>
        </template>
      </Tree>
    </div>

    <ContextMenu ref="contextMenu" :model="menuItems">
      <template #itemicon="{ item }">
        <WwIcon v-if="item.wwIcon" :name="item.wwIcon" size="sm" class="ww-menu-item-icon" />
      </template>
    </ContextMenu>

    <RssFeedDialog
      v-model:visible="feedDialogVisible"
      :groups="rssStore.groups"
      :feed="editingFeed"
      :default-group-id="pendingGroupId"
      @save="onSaveFeed"
    />

    <RssMoveDialog
      v-model:visible="moveDialogVisible"
      :groups="rssStore.groups"
      :feed-title="moveFeedTarget?.title"
      @move="onMoveFeed"
    />

    <RssGroupDialog
      v-model:visible="groupDialogVisible"
      :title="groupDialogTitle"
      :initial-name="groupDialogInitialName"
      :confirm-label="groupDialogConfirmLabel"
      @save="onSaveGroup"
    />
  </div>
</template>
