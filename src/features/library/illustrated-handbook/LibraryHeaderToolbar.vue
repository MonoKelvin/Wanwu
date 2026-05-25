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
    class: sortField.value === opt.value ? 'ww-page-toolbar-menu__item--active' : undefined,
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
    <IconField class="ww-field-search ww-page-toolbar__search">
      <WwInputIcon name="search" />
      <AutoComplete
        v-model="listSearch"
        :suggestions="suggestions"
        option-label="name"
        placeholder="搜索条目…"
        class="ww-page-toolbar__autocomplete"
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

    <div class="ww-page-toolbar__cluster">
      <WwButton
        v-if="listSearch"
        type="button"
        icon="x"
        size="small"
        variant="text"
        rounded
        severity="secondary"
        aria-label="清除搜索"
        @click="clearSearch"
      />
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
/* 带搜索图标的输入框（侧栏分类、页头工具栏） */
.ww-field-search {
  width: 100%;
}

.ww-field-search .p-inputtext {
  width: 100%;
  font-size: 0.8125rem;
  padding: 0.4375rem 0.625rem 0.4375rem 1.75rem;
}

.ww-field-search .p-iconfield .p-inputicon {
  inset-block: 0;
  display: flex;
  align-items: center;
  width: 1.75rem;
  font-size: 0.8125rem;
  color: var(--ww-ink-faint);
}

/* 页面头工具栏（与 RSS 刷新按钮等同尺度） */
.ww-page-toolbar {
  --ww-toolbar-h: 2.125rem;

  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.ww-page-toolbar__search {
  width: min(100%, 12.5rem);
  min-width: 9rem;
}

.ww-page-toolbar__autocomplete {
  width: 100%;
}

.ww-page-toolbar__search-input {
  width: 100%;
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
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.125rem 0;
}

.ww-library-search__option-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ww-ink);
}

.ww-library-search__option-summary {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--ww-ink-muted);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
