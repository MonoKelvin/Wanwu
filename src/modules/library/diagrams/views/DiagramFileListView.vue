<script setup lang="ts">
defineOptions({ name: 'DiagramFileListView' })

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import type { DiagramFileMeta } from '@shared/types/diagrams'
import { useDiagramsStore } from '@shared/stores/diagrams'
import { useDiagramCatalogCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { DG_DRAFTS, DG_FILES, DG_HOME, DG_RECYCLE } from '@modules/library/diagrams/domain/diagramFolderIds'
import { pushShellRoute } from '@app/composables/shellNavigation'

const route = useRoute()
const router = useRouter()
const store = useDiagramsStore()
const bus = useDiagramCatalogCommandBus()
const confirm = useWanwuConfirm()
const toast = useWanwuToast()
const search = ref('')

const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const menuTarget = ref<DiagramFileMeta | null>(null)
const renameOpen = ref(false)
const renameValue = ref('')
const moveOpen = ref(false)
const moveFolderId = ref(DG_FILES)
const importBusy = ref(false)

const folderId = computed(() => route.params.folderId as string)
const folderName = computed(() => store.folderById(folderId.value)?.name ?? '文件')
const isRecycle = computed(() => folderId.value === DG_RECYCLE)

const movableFolders = computed(() =>
  store.folders.filter(
    (f) =>
      f.id !== DG_HOME &&
      f.id !== DG_RECYCLE &&
      f.id !== folderId.value &&
      !f.deletedAt
  )
)

const files = computed(() => {
  const list = store.filesByFolder[folderId.value] ?? []
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((f) => f.title.toLowerCase().includes(q))
})

const menuItems = computed<WwMenuItem[]>(() => {
  const file = menuTarget.value
  if (!file || isRecycle.value) return []
  return [
    { label: '打开', wwIcon: 'external-link', command: () => void openFile(file.id) },
    { label: '重命名', wwIcon: 'pencil', command: () => openRename(file) },
    { label: '复制', wwIcon: 'copy', command: () => void duplicateFile(file.id) },
    { label: '移动到…', wwIcon: 'folder', command: () => openMove(file) },
    { separator: true },
    {
      label: '移入回收站',
      wwIcon: 'trash-2',
      command: () => void softDelete(file.id)
    }
  ]
})

async function load() {
  await store.loadFiles(folderId.value)
  if (!store.loaded) await store.loadFolders()
  if (isRecycle.value) await store.refreshRecycleCount()
}

onMounted(load)
watch(folderId, load)

async function createNew() {
  const result = await bus.dispatch({
    type: 'file.create',
    payload: { folderId: folderId.value, title: '未命名流程图' }
  })
  if (!result.ok || !result.data) return
  const record = result.data as { meta: { id: string } }
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId: record.meta.id }
  })
}

async function openFile(fileId: string, options?: { fitView?: boolean }) {
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId },
    query: options?.fitView ? { fitView: '1' } : {}
  })
}

function openMenu(event: MouseEvent, file: DiagramFileMeta) {
  event.stopPropagation()
  menuTarget.value = file
  void menuRef.value?.show(event)
}

function openRename(file: DiagramFileMeta) {
  menuTarget.value = file
  renameValue.value = file.title
  renameOpen.value = true
}

async function commitRename() {
  const file = menuTarget.value
  if (!file) return
  const title = renameValue.value.trim()
  renameOpen.value = false
  if (!title || title === file.title) return
  const result = await bus.dispatch({
    type: 'file.rename',
    payload: { fileId: file.id, title }
  })
  if (result.ok) {
    toast.success('已重命名')
    await load()
  } else {
    toast.error('重命名失败')
  }
}

function openMove(file: DiagramFileMeta) {
  menuTarget.value = file
  moveFolderId.value = movableFolders.value[0]?.id ?? DG_FILES
  moveOpen.value = true
}

async function commitMove() {
  const file = menuTarget.value
  if (!file) return
  moveOpen.value = false
  const result = await bus.dispatch({
    type: 'file.move',
    payload: { fileId: file.id, folderId: moveFolderId.value }
  })
  if (result.ok) {
    toast.success('已移动')
    await load()
  } else {
    toast.error('移动失败')
  }
}

async function duplicateFile(fileId: string) {
  const record = await window.wanwu.diagrams.duplicateFile({ fileId })
  if (!record) {
    toast.error('复制失败')
    return
  }
  toast.success('已创建副本')
  await load()
}

async function softDelete(fileId: string) {
  const ok = await confirm.ask({
    header: '移入回收站？',
    message: '文件可在回收站中恢复。',
    danger: true,
    acceptLabel: '移入回收站',
    width: 'min(92vw, 22rem)'
  })
  if (!ok) return
  const result = await bus.dispatch({ type: 'file.softDelete', payload: { fileId } })
  if (result.ok) {
    toast.success('已移入回收站')
    await load()
    await store.refreshRecycleCount()
  }
}

async function restore(fileId: string) {
  const result = await bus.dispatch({ type: 'file.restore', payload: { fileId } })
  if (result.ok) {
    await load()
    await store.refreshRecycleCount()
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
    await load()
    await store.refreshRecycleCount()
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}

async function importDrawioFile() {
  if (importBusy.value || isRecycle.value) return
  importBusy.value = true
  try {
    const record = await window.wanwu.diagrams.importDrawioAndCreate({ folderId: folderId.value })
    if (!record) {
      toast.error('导入失败')
      return
    }
    if ('canceled' in record) return
    toast.success('已导入 draw.io 图表')
    await load()
    await openFile(record.meta.id, { fitView: true })
  } finally {
    importBusy.value = false
  }
}

async function importWfgFile() {
  if (importBusy.value || isRecycle.value) return
  importBusy.value = true
  try {
    const record = await window.wanwu.diagrams.importWfgAndCreate({ folderId: folderId.value })
    if (!record) {
      toast.error('导入失败')
      return
    }
    if ('canceled' in record) return
    toast.success('已导入到当前分组')
    await load()
    await openFile(record.meta.id, { fitView: true })
  } finally {
    importBusy.value = false
  }
}
</script>

<template>
  <ModulePageLayout>
    <template #header>
      <PageHeader :title="folderName" :subtitle="isRecycle ? '已删除的文件可恢复或永久清除' : undefined" stacked-titles>
        <template #actions>
          <div class="dg-page-header-actions">
            <IconField class="ww-field-search">
              <WwInputIcon name="search" />
              <InputText
                v-model="search"
                placeholder="搜索…"
                class="w-full"
                aria-label="搜索流程图"
              />
            </IconField>
            <WwButton
              v-if="!isRecycle"
              label="导入 .wfg"
              icon="folder-open"
              size="small"
              severity="secondary"
              :loading="importBusy"
              @click="importWfgFile"
            />
            <WwButton
              v-if="!isRecycle"
              label="导入 draw.io"
              icon="external-link"
              size="small"
              severity="secondary"
              :loading="importBusy"
              @click="importDrawioFile"
            />
            <WwButton v-if="!isRecycle" label="新建" icon="plus" size="small" @click="createNew" />
          </div>
        </template>
      </PageHeader>
    </template>

    <div class="dg-page-inner dg-page-inner--wide dg-fade-in">
      <EmptyState
        v-if="!files.length"
        :title="isRecycle ? '回收站为空' : '暂无文件'"
        :description="isRecycle ? undefined : '点击右上角新建，或从首页选择模板'"
        compact
      >
        <WwButton v-if="!isRecycle" label="新建" icon="plus" @click="createNew" />
      </EmptyState>

      <div v-else class="dg-list-panel">
        <ul class="dg-list-panel__rows">
          <li v-for="file in files" :key="file.id" class="dg-file-item">
            <button type="button" class="dg-list-row" @click="openFile(file.id)">
              <span class="dg-list-row__icon">
                <WwIcon name="layers" size="sm" />
              </span>
              <span class="dg-list-row__body">
                <span class="dg-list-row__title">{{ file.title }}</span>
                <span class="dg-list-row__meta">{{ file.pageCount }} 页 · {{ formatTime(file.updatedAt) }}</span>
              </span>
            </button>
            <div class="dg-file-item__actions">
              <template v-if="isRecycle">
                <WwButton label="恢复" size="small" severity="secondary" @click="restore(file.id)" />
                <WwButton label="删除" size="small" severity="danger" @click="purge(file.id)" />
              </template>
              <WwButton
                v-else
                icon="ellipsis-vertical"
                size="small"
                severity="secondary"
                text
                rounded
                aria-label="更多操作"
                @click="openMenu($event, file)"
              />
            </div>
          </li>
        </ul>
      </div>
    </div>

    <WwContextMenu ref="menuRef" :model="menuItems" />

    <Dialog
      v-model:visible="renameOpen"
      header="重命名"
      modal
      append-to="body"
      class="ww-glass-dialog w-[min(22rem,92vw)]"
    >
      <InputText v-model="renameValue" class="w-full" autofocus @keydown.enter.prevent="commitRename" />
      <template #footer>
        <WwButton label="取消" severity="secondary" text @click="renameOpen = false" />
        <WwButton label="确定" @click="commitRename" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="moveOpen"
      header="移动到"
      modal
      append-to="body"
      class="ww-glass-dialog w-[min(22rem,92vw)]"
    >
      <ul class="dg-folder-picker">
        <li v-for="folder in movableFolders" :key="folder.id">
          <button
            type="button"
            class="dg-folder-picker__item"
            :class="{ 'dg-folder-picker__item--active': moveFolderId === folder.id }"
            @click="moveFolderId = folder.id"
          >
            {{ folder.name }}
          </button>
        </li>
      </ul>
      <template #footer>
        <WwButton label="取消" severity="secondary" text @click="moveOpen = false" />
        <WwButton label="移动" @click="commitMove" />
      </template>
    </Dialog>
  </ModulePageLayout>
</template>

<style>
@import '../styles/diagram-shared.css';
</style>
