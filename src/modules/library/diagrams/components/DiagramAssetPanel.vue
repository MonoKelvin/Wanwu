<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import DiagramShapePreview from '@modules/library/diagrams/components/DiagramShapePreview.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import { DIAGRAM_SHAPE_CATEGORIES } from '@modules/library/diagrams/lib/diagramShapeRegistry'
import { filterShapeCategories } from '@modules/library/diagrams/lib/diagramShapeSearch'
import { writeShapeDragData } from '@modules/library/diagrams/lib/diagramShapeDrag'
import {
  toggleAssetPanelCollapsed,
  useDiagramEditorLayout
} from '@modules/library/diagrams/composables/useDiagramEditorLayout'

const search = ref('')
const activeCategory = ref<string>('all')
const layout = useDiagramEditorLayout()

const categoryTabs = computed(() => [
  { id: 'all', label: '全部' },
  ...DIAGRAM_SHAPE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))
])

const categories = computed(() => {
  const filtered = filterShapeCategories(DIAGRAM_SHAPE_CATEGORIES, search.value)
  if (activeCategory.value === 'all') return filtered
  return filtered.filter((c) => c.id === activeCategory.value)
})

const totalVisible = computed(() =>
  categories.value.reduce((sum, cat) => sum + cat.items.length, 0)
)

watch(search, (q) => {
  if (q.trim()) activeCategory.value = 'all'
})

function onShapeDragStart(event: DragEvent, shapeId: string, defaultText: string) {
  writeShapeDragData(event, { shapeId, defaultText })
}
</script>

<template>
  <aside
    class="dg-asset-panel dg-float dg-float--left ww-glass-blur"
    aria-label="素材"
  >
    <header class="dg-asset-panel__head">
      <WwIcon name="layout-grid" size="sm" class="dg-asset-panel__head-icon" />
      <span class="dg-asset-panel__head-title">图元</span>
      <span v-if="totalVisible" class="dg-asset-panel__count">{{ totalVisible }}</span>
      <WwIconButton
        icon="chevron-left"
        icon-size="sm"
        class="dg-panel__collapse-btn"
        aria-label="收起图元面板"
        compact
        @click="toggleAssetPanelCollapsed(layout)"
      />
    </header>

    <div class="dg-asset-panel__search">
      <IconField class="dg-asset-panel__search-field">
        <WwInputIcon name="search" />
        <InputText
          v-model="search"
          placeholder="搜索图元…"
          class="w-full"
          aria-label="搜索图元"
        />
      </IconField>
    </div>

    <div v-if="!search.trim()" class="dg-asset-panel__tabs" role="tablist" aria-label="图元分类">
      <button
        v-for="tab in categoryTabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="dg-asset-tab"
        :class="{ 'dg-asset-tab--active': activeCategory === tab.id }"
        :aria-selected="activeCategory === tab.id"
        @click="activeCategory = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="dg-asset-panel__body ww-scroll-main">
      <p class="dg-asset-panel__hint">拖拽图元到画布创建</p>
      <section v-for="group in categories" :key="group.id" class="dg-shape-group">
        <h4 v-if="activeCategory === 'all' || search.trim()" class="dg-shape-group__label">
          {{ group.label }}
        </h4>
        <div class="dg-shape-group__grid dg-shape-group__grid--compact">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="dg-shape-item dg-shape-item--draggable"
            draggable="true"
            role="listitem"
            :title="`${item.label} — 拖到画布`"
            :aria-label="`拖拽${item.label}到画布`"
            @dragstart="onShapeDragStart($event, item.id, item.defaultText)"
          >
            <DiagramShapePreview :spec="item.preview" />
            <span class="dg-shape-item__label">{{ item.label }}</span>
          </div>
        </div>
      </section>

      <p v-if="!categories.length" class="dg-asset-panel__empty">无匹配图元</p>
    </div>
  </aside>
</template>
