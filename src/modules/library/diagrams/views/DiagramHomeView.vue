<script setup lang="ts">
defineOptions({ name: 'DiagramHomeView' })

import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'
import { useDiagramsStore } from '@shared/stores/diagrams'
import { listDiagramTemplates } from '@modules/library/diagrams/lib/diagramTemplates'
import { pushShellRoute } from '@app/composables/shellNavigation'

const router = useRouter()
const store = useDiagramsStore()
const templates = listDiagramTemplates().filter((t) => t.id !== 'tpl-blank')

const TEMPLATE_ICONS: Record<string, WwIconName> = {
  'tpl-flow': 'arrow-right',
  'tpl-decision': 'sparkles',
  'tpl-swimlane': 'rows',
  'tpl-mind': 'layers'
}

onMounted(async () => {
  await store.loadRecent()
})

async function openTemplate(templateId: string) {
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId: 'new' },
    query: { template: templateId }
  })
}

async function openRecent(fileId: string) {
  await pushShellRoute(router, {
    name: 'library-diagrams-editor',
    params: { fileId }
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}

function templateIcon(id: string): WwIconName {
  return TEMPLATE_ICONS[id] ?? 'square'
}
</script>

<template>
  <ModulePageLayout>
    <template #header>
      <PageHeader title="流程图" subtitle="本地绘制与整理" stacked-titles>
        <template #actions>
          <WwButton label="新建" icon="plus" size="small" @click="openTemplate('tpl-blank')" />
        </template>
      </PageHeader>
    </template>

    <div class="dg-page-inner dg-fade-in">
      <section class="dg-block">
        <h3 class="dg-section-label">模板</h3>
        <div class="dg-template-grid">
          <button
            v-for="tpl in templates"
            :key="tpl.id"
            type="button"
            class="dg-template-card"
            @click="openTemplate(tpl.id)"
          >
            <span class="dg-template-card__icon">
              <WwIcon :name="templateIcon(tpl.id)" size="sm" />
            </span>
            <span class="dg-template-card__name">{{ tpl.name }}</span>
            <span class="dg-template-card__desc">{{ tpl.description }}</span>
          </button>
        </div>
      </section>

      <section class="dg-block">
        <h3 class="dg-section-label">最近打开</h3>
        <div v-if="store.recentFiles.length" class="dg-list-panel">
          <ul class="dg-list-panel__rows">
            <li v-for="file in store.recentFiles" :key="file.id">
              <button type="button" class="dg-list-row" @click="openRecent(file.id)">
                <span class="dg-list-row__icon">
                  <WwIcon name="layers" size="sm" />
                </span>
                <span class="dg-list-row__body">
                  <span class="dg-list-row__title">{{ file.title }}</span>
                  <span class="dg-list-row__meta">
                    {{ store.folderById(file.folderId)?.name ?? file.folderId }} ·
                    {{ file.pageCount }} 页 · {{ formatTime(file.updatedAt) }}
                  </span>
                </span>
                <WwIcon name="chevron-right" size="sm" class="dg-list-row__chevron" />
              </button>
            </li>
          </ul>
        </div>
        <p v-else class="dg-hint">暂无最近文件</p>
      </section>
    </div>
  </ModulePageLayout>
</template>

<style>
@import '../styles/diagram-shared.css';
</style>
