<script setup lang="ts">
defineOptions({ name: 'PixelHomeView' })

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import WwButton from '@shared/components/WwButton.vue'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'
import { PIXEL_MAX_HEIGHT, PIXEL_MAX_WIDTH, PIXEL_SIZE_PRESETS } from '@modules/library/pixel-art/domain/constants'
import { openBlankEditor } from '@modules/library/pixel-art/composables/usePixelEditorState'
import { pushShellRoute } from '@app/composables/shellNavigation'
import { LIBRARY_PIXEL_ART_EDITOR_ROUTE } from '@modules/library/pixel-art/domain/routes'

const router = useRouter()
const store = usePixelArtStore()
const loading = ref(true)

onMounted(async () => {
  await store.loadFolders()
  await store.loadRecent()
  loading.value = false
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
</script>

<template>
  <ModulePageLayout>
    <PageHeader title="像素画" subtitle="本地像素创作与整理" />
    <section class="section">
      <h2>新建</h2>
      <div class="presets">
        <WwButton v-for="size in PIXEL_SIZE_PRESETS" :key="size" @click="newBlank(size)">
          {{ size }}×{{ size }}
        </WwButton>
        <WwButton variant="ghost" @click="newBlank(32)">空白新建</WwButton>
        <WwButton variant="ghost" @click="newCustomSize">自定义尺寸…</WwButton>
      </div>
    </section>
    <section class="section">
      <h2>最近打开</h2>
      <p v-if="loading">加载中…</p>
      <ul v-else-if="store.recentFiles.length" class="recent-list">
        <li v-for="file in store.recentFiles" :key="file.id">
          <button type="button" class="recent-item" @click="openRecent(file.id)">
            <span class="name">{{ file.title }}</span>
            <span class="meta">{{ file.width }}×{{ file.height }} · {{ file.updatedAt.slice(0, 10) }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="empty">暂无最近文件</p>
    </section>
  </ModulePageLayout>
</template>

<style scoped>
.section {
  margin-top: 24px;
}

.section h2 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: var(--ww-inset);
  cursor: pointer;
  text-align: left;
}

.recent-item:hover {
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
  color: var(--ww-text-muted);
  font-size: 13px;
}
</style>
