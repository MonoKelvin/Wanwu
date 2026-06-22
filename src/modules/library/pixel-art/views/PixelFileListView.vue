<script setup lang="ts">
defineOptions({ name: 'PixelFileListView' })

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import WwButton from '@shared/components/WwButton.vue'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'
import { pushShellRoute } from '@app/composables/shellNavigation'
import { LIBRARY_PIXEL_ART_EDITOR_ROUTE } from '@modules/library/pixel-art/domain/routes'
import { openBlankEditor } from '@modules/library/pixel-art/composables/usePixelEditorState'
import { PA_FILES, PA_RECYCLE } from '@modules/library/pixel-art/domain/folderIds'

const route = useRoute()
const router = useRouter()
const store = usePixelArtStore()
const loading = ref(true)

const folderId = computed(() => String(route.params.folderId ?? PA_FILES))
const folderName = computed(() => store.folderById(folderId.value)?.name ?? '文件')
const files = computed(() => store.filesByFolder[folderId.value] ?? [])

onMounted(async () => {
  await store.loadFolders()
  await store.loadFiles(folderId.value)
  loading.value = false
})

async function openFile(fileId: string) {
  await pushShellRoute(router, { name: LIBRARY_PIXEL_ART_EDITOR_ROUTE, params: { fileId } })
}

function createNew() {
  void openBlankEditor(router)
}
</script>

<template>
  <ModulePageLayout>
    <PageHeader :title="folderName">
      <template #actions>
        <WwButton v-if="folderId !== PA_RECYCLE" @click="createNew">新建</WwButton>
      </template>
    </PageHeader>
    <p v-if="loading">加载中…</p>
    <ul v-else class="file-list">
      <li v-for="file in files" :key="file.id">
        <button type="button" class="file-item" @click="openFile(file.id)">
          <span class="name">{{ file.title }}</span>
          <span class="meta">{{ file.width }}×{{ file.height }} · {{ file.updatedAt.slice(0, 10) }}</span>
        </button>
      </li>
    </ul>
    <p v-if="!loading && !files.length" class="empty">此分组暂无文件</p>
  </ModulePageLayout>
</template>

<style scoped>
.file-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: var(--ww-inset);
  cursor: pointer;
  text-align: left;
}

.file-item:hover {
  background: var(--ww-accent-subtle);
}

.name {
  font-size: 14px;
}

.meta {
  font-size: 12px;
  color: var(--ww-text-muted);
}

.empty {
  margin-top: 16px;
  color: var(--ww-text-muted);
}
</style>
