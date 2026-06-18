<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import DiagramShapeGroup from '@modules/library/diagrams/components/DiagramShapeGroup.vue'
import DiagramShapePaletteItem from '@modules/library/diagrams/components/DiagramShapePaletteItem.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import { useDiagramRecentShapes } from '@modules/library/diagrams/composables/useDiagramRecentShapes'
import {
  isAssetSectionExpanded,
  setAssetSectionExpanded
} from '@modules/library/diagrams/lib/diagramAssetPanelSections'
import {
  DIAGRAM_SHAPE_CATEGORIES,
  getDiagramShapeById
} from '@modules/library/diagrams/lib/diagramShapeRegistry'
import { getRecommendedShapes } from '@modules/library/diagrams/lib/diagramShapeRecommendations'
import { filterShapeCategories } from '@modules/library/diagrams/lib/diagramShapeSearch'
import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'
import {
  toggleAssetPanelCollapsed,
  useDiagramEditorLayout
} from '@modules/library/diagrams/composables/useDiagramEditorLayout'

const CATEGORY_ICONS: Record<string, string> = {
  basic: 'square',
  flowchart: 'rows',
  polygon: 'star',
  uml: 'box',
  architecture: 'layers',
  bpmn: 'layers',
  annotation: 'message-circle'
}

const search = ref('')
const layout = useDiagramEditorLayout()
const { recentIds } = useDiagramRecentShapes()

const sectionExpanded = reactive<Record<string, boolean>>({})

function initSectionState() {
  for (const id of ['recent', 'recommend', ...DIAGRAM_SHAPE_CATEGORIES.map((c) => c.id)]) {
    if (sectionExpanded[id] == null) {
      sectionExpanded[id] = isAssetSectionExpanded(id)
    }
  }
}

initSectionState()

const filteredCategories = computed(() =>
  filterShapeCategories(DIAGRAM_SHAPE_CATEGORIES, search.value)
)

const recentShapes = computed(() =>
  recentIds.value
    .map((id) => getDiagramShapeById(id))
    .filter((item): item is DiagramShapeItem => Boolean(item))
)

const recommendedShapes = computed(() =>
  getRecommendedShapes(DIAGRAM_SHAPE_CATEGORIES, recentIds.value)
)

const totalVisible = computed(() => {
  if (search.value.trim()) {
    return filteredCategories.value.reduce((sum, cat) => sum + cat.items.length, 0)
  }
  return (
    recentShapes.value.length +
    recommendedShapes.value.length +
    DIAGRAM_SHAPE_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0)
  )
})

const isSearching = computed(() => Boolean(search.value.trim()))

watch(isSearching, (searching) => {
  if (!searching) return
  for (const cat of filteredCategories.value) {
    sectionExpanded[cat.id] = true
  }
})

function toggleSection(id: string) {
  sectionExpanded[id] = !sectionExpanded[id]
  setAssetSectionExpanded(id, sectionExpanded[id])
}
</script>

<template>
  <aside
    class="dg-asset-panel dg-float dg-float--left ww-glass-blur"
    aria-label="图形"
  >
    <header class="dg-asset-panel__head">
      <WwIcon name="layout-grid" size="sm" class="dg-asset-panel__head-icon" />
      <span class="dg-asset-panel__head-title">图形</span>
      <span v-if="totalVisible" class="dg-asset-panel__count">{{ totalVisible }}</span>
      <WwIconButton
        icon="chevron-left"
        icon-size="sm"
        class="dg-panel__collapse-btn"
        ariaLabel="收起图形面板"
        compact
        @click="toggleAssetPanelCollapsed(layout)"
      />
    </header>

    <div class="dg-asset-panel__search">
      <IconField class="dg-asset-panel__search-field">
        <WwInputIcon name="search" />
        <InputText
          v-model="search"
          placeholder="搜索图形…"
          class="w-full"
          aria-label="搜索图形"
        />
      </IconField>
    </div>

    <div class="dg-asset-panel__body ww-scroll-main">
      <template v-if="!isSearching">
        <DiagramShapeGroup
          v-if="recentShapes.length"
          title="最近使用"
          icon="clock"
          variant="recent"
          :expanded="sectionExpanded.recent ?? false"
          :count="recentShapes.length"
          @toggle="toggleSection('recent')"
        >
          <div class="dg-shape-group__grid">
            <DiagramShapePaletteItem
              v-for="item in recentShapes"
              :key="`recent-${item.id}`"
              :item="item"
            />
          </div>
        </DiagramShapeGroup>

        <DiagramShapeGroup
          title="智能推荐"
          icon="sparkles"
          variant="recommend"
          :expanded="sectionExpanded.recommend ?? false"
          :count="recommendedShapes.length"
          @toggle="toggleSection('recommend')"
        >
          <div class="dg-shape-group__grid">
            <DiagramShapePaletteItem
              v-for="item in recommendedShapes"
              :key="`rec-${item.id}`"
              :item="item"
            />
          </div>
        </DiagramShapeGroup>
      </template>

      <DiagramShapeGroup
        v-for="group in filteredCategories"
        :key="group.id"
        :title="group.label"
        :icon="CATEGORY_ICONS[group.id]"
        :expanded="sectionExpanded[group.id] ?? group.id === 'basic'"
        :count="group.items.length"
        @toggle="toggleSection(group.id)"
      >
        <div class="dg-shape-group__grid">
          <DiagramShapePaletteItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
          />
        </div>
      </DiagramShapeGroup>

      <p v-if="!filteredCategories.length && isSearching" class="dg-asset-panel__empty">
        无匹配图形
      </p>
    </div>
  </aside>
</template>
