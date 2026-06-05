<script setup lang="ts">
defineOptions({ name: 'DiagramFileListView' })

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import { useDiagramsStore } from '@shared/stores/diagrams'
import { useDiagramCatalogCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { DG_RECYCLE } from '@modules/library/diagrams/domain/diagramFolderIds'
import { pushShellRoute } from '@app/composables/shellNavigation'

const route = useRoute()
const router = useRouter()
const store = useDiagramsStore()
const bus = useDiagramCatalogCommandBus()
const search = ref('')

const folderId = computed(() => route.params.folderId as string)
const folderName = computed(() => store.folderById(folderId.value)?.name ?? '文件')
const isRecycle = computed(() => folderId.value === DG_RECYCLE)

const files = computed(() => {
  const list = store.filesByFolder[folderId.value] ?? []
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((f) => f.title.toLowerCase().includes(q))
})

async function load() {
  await store.loadFiles(folderId.value)
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

async function openFile(fileId: string) {
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId }
  })
}

async function softDelete(fileId: string) {
  const result = await bus.dispatch({ type: 'file.softDelete', payload: { fileId } })
  if (result.ok) {
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
  if (!confirm('永久删除后无法恢复，确定继续？')) return
  const result = await bus.dispatch({ type: 'file.purge', payload: { fileId } })
  if (result.ok) {
    await load()
    await store.refreshRecycleCount()
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <ModulePageLayout>
    <template #header>
      <PageHeader :title="folderName" :subtitle="isRecycle ? '已删除的文件可恢复或永久清除' : undefined" stacked-titles>
        <template #actions>
          <div class="flex items-center gap-2">
            <IconField class="ww-field-search w-44">
              <WwInputIcon name="search" />
              <InputText
                v-model="search"
                placeholder="搜索…"
                class="w-full"
                aria-label="搜索流程图"
              />
            </IconField>
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
                icon="trash-2"
                size="small"
                severity="secondary"
                text
                rounded
                aria-label="移入回收站"
                @click="softDelete(file.id)"
              />
            </div>
          </li>
        </ul>
      </div>
    </div>
  </ModulePageLayout>
</template>

<style>
@import '../styles/diagram-shared.css';
</style>
