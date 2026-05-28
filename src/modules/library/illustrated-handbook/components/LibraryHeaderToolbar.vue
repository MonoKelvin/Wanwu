<script setup lang="ts">
import { computed, ref } from 'vue'
import AutoComplete from 'primevue/autocomplete'
import IconField from 'primevue/iconfield'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import EmptyState from '@app/components/EmptyState.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwViewModeToggle, { type WwViewMode } from '@shared/components/WwViewModeToggle.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import type { WwIconName } from '@shared/icons/registry'
import type { WwMenuItem } from '@shared/types/menu'
import type { Item } from '@shared/types/item'

export type LibraryViewMode = WwViewMode
export type LibrarySortField = 'updatedAt' | 'createdAt' | 'name'

const listSearch = defineModel<string>('search', { default: '' })
const viewMode = defineModel<LibraryViewMode>('viewMode', { required: true })
const sortField = defineModel<LibrarySortField>('sortField', { required: true })

const props = defineProps<{
  suggestions: Item[]
}>()

const emit = defineEmits<{
  complete: [event: { query: string }]
  selectItem: [item: Item]
}>()

const sortOptions: Array<{ label: string; value: LibrarySortField; wwIcon: WwIconName }> = [
  { label: '更新时间', value: 'updatedAt', wwIcon: 'clock' },
  { label: '添加时间', value: 'createdAt', wwIcon: 'calendar-plus' },
  { label: '名称', value: 'name', wwIcon: 'arrow-down-a-z' }
]

const sortMenu = ref<InstanceType<typeof WwContextMenu> | null>(null)

const currentSort = computed(() => sortOptions.find((o) => o.value === sortField.value) ?? sortOptions[0])

const sortMenuItems = computed((): WwMenuItem[] =>
  sortOptions.map((opt) => ({
    label: opt.label,
    wwIcon: opt.wwIcon,
    checked: sortField.value === opt.value,
    command: () => {
      sortField.value = opt.value
    }
  }))
)

const showSearchEmpty = computed(
  () => listSearch.value.trim().length > 0 && props.suggestions.length === 0
)

function toggleSortMenu(event: MouseEvent) {
  const anchor = event.currentTarget
  if (anchor instanceof HTMLElement) sortMenu.value?.toggleAnchor(anchor)
}

function clearSearch() {
  listSearch.value = ''
}
</script>

<template>
  <div class="ww-page-toolbar" role="toolbar" aria-label="全库列表工具">
    <div class="ww-page-toolbar__search-wrap">
      <IconField class="ww-field-search ww-page-toolbar__search">
        <WwInputIcon name="search" />
        <AutoComplete
          v-model="listSearch"
          :suggestions="suggestions"
          option-label="name"
          placeholder="搜索条目…"
          class="ww-page-toolbar__autocomplete"
          append-to="self"
          input-class="ww-page-toolbar__search-input"
          aria-label="搜索条目"
          :min-length="1"
          :delay="0"
          :show-empty-message="showSearchEmpty"
          empty-search-message=""
          @complete="emit('complete', $event)"
          @item-select="emit('selectItem', $event.value)"
        >
          <template #option="{ option }">
            <div class="ww-library-search__option">
              <span class="ww-library-search__option-name">{{ option.name }}</span>
              <p v-if="option.summary" class="ww-library-search__option-summary">
                {{ option.summary }}
              </p>
            </div>
          </template>
          <template #empty>
            <EmptyState
              compact
              variant="not-found"
              code="404"
              title="无匹配条目"
              description="换个关键词试试"
            />
          </template>
        </AutoComplete>
      </IconField>
      <button
        v-if="listSearch"
        type="button"
        class="ww-page-toolbar__clear"
        aria-label="清除搜索"
        @click="clearSearch"
      >
        <WwIcon name="x" size="sm" />
      </button>
    </div>

    <div class="ww-page-toolbar__cluster">
      <WwViewModeToggle v-model="viewMode" aria-label="展示方式" />
      <WwButton
        type="button"
        :icon="currentSort.wwIcon"
        size="small"
        variant="outlined"
        severity="secondary"
        :aria-label="`排序：${currentSort.label}`"
        v-tooltip.bottom="`排序：${currentSort.label}`"
        @click="toggleSortMenu"
      />
      <WwContextMenu ref="sortMenu" :model="sortMenuItems" />
    </div>
  </div>
</template>
<style>
@import '../../core/styles/library-shared.css';

/* 页面头工具栏（与 RSS 刷新按钮等同尺度） */
.ww-page-toolbar {
  --ww-toolbar-h: 2.125rem;

  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.ww-page-toolbar__search-wrap {
  position: relative;
  flex: 1 1 18.75rem;
  width: 100%;
  max-width: 18.75rem;
  min-width: 0;
}

.ww-page-toolbar__search {
  width: 100%;
}

.ww-page-toolbar__autocomplete {
  width: 100%;
  /* 图鉴页搜索下拉：通过 CSS 变量定制 Autocomplete 面板 */
  --ww-autocomplete-panel-bg: var(--ww-glass-bg);
  --ww-autocomplete-panel-fg: var(--ww-ink);
  --ww-autocomplete-panel-radius: 0.75rem;
  --ww-autocomplete-panel-border: var(--ww-border-subtle);
  --ww-autocomplete-panel-shadow: var(--ww-menu-shadow);
}

.ww-page-toolbar__autocomplete .p-autocomplete-overlay,
.ww-page-toolbar__autocomplete .p-autocomplete-panel {
  left: auto !important;
  right: 0;
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  background: var(--ww-glass-bg);
  backdrop-filter: blur(var(--ww-blur-glass)) saturate(1.15);
}

.ww-page-toolbar__autocomplete .p-autocomplete-option {
  min-width: 0;
  overflow: hidden;
}

.ww-page-toolbar__search-input {
  width: 100%;
}

.ww-page-toolbar__clear {
  position: absolute;
  inset-block: 0;
  right: 0.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ww-ink-muted);
  cursor: pointer;
}

.ww-page-toolbar__clear:hover {
  background: transparent;
  color: var(--ww-ink);
}

/* 不显示 PrimeVue 默认空列表文案；保留带 .ww-empty-state 的自定义 #empty 插槽 */
.p-autocomplete-empty-message:not(:has(.ww-empty-state)) {
  display: none !important;
  padding: 0 !important;
  min-height: 0 !important;
}

.p-select-empty-message,
.p-listbox-empty-message,
.p-multiselect-empty-message {
  display: none !important;
}

.ww-library-search__option {
  display: flex;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.125rem 0;
}

.ww-library-search__option-name {
  display: block;
  width: 100%;
  max-width: 100%;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ww-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ww-library-search__option-summary {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--ww-ink-muted);
  display: block;
  width: 100%;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ww-page-toolbar__cluster {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.ww-page-toolbar .p-inputtext {
  height: var(--ww-toolbar-h);
  padding-block: 0;
  line-height: var(--ww-toolbar-h);
}

.ww-page-toolbar .p-button {
  height: var(--ww-toolbar-h);
}

.ww-page-toolbar .p-button.p-button-icon-only {
  width: var(--ww-toolbar-h);
  min-width: var(--ww-toolbar-h);
  padding: 0;
}

.ww-page-toolbar-menu.p-menu {
  min-width: 7.5rem;
}

.ww-page-toolbar-menu .p-menu-item.ww-page-toolbar-menu__item--active > .p-menu-item-content {
  background: var(--ww-menu-item-active-bg) !important;
  color: var(--ww-ink) !important;
  font-weight: 500;
}
</style>
