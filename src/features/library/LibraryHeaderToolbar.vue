<script setup lang="ts">
import { computed, ref } from 'vue'
import AutoComplete from 'primevue/autocomplete'
import IconField from 'primevue/iconfield'
import Menu from 'primevue/menu'
import SelectButton from 'primevue/selectbutton'
import EmptyState from '@app/components/EmptyState.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import type { WwIconName } from '@shared/icons/registry'
import type { WwMenuItem } from '@shared/types/menu'
import type { Item } from '@shared/types/item'

export type LibraryViewMode = 'card' | 'list'
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

const viewModeOptions: Array<{ label: string; value: LibraryViewMode; wwIcon: WwIconName }> = [
  { label: '卡片', value: 'card', wwIcon: 'layout-grid' },
  { label: '列表', value: 'list', wwIcon: 'list' }
]

const sortOptions: Array<{ label: string; value: LibrarySortField; wwIcon: WwIconName }> = [
  { label: '更新时间', value: 'updatedAt', wwIcon: 'clock' },
  { label: '添加时间', value: 'createdAt', wwIcon: 'calendar-plus' },
  { label: '名称', value: 'name', wwIcon: 'arrow-down-a-z' }
]

const sortMenu = ref<InstanceType<typeof Menu> | null>(null)

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

function toggleSortMenu(event: Event) {
  sortMenu.value?.toggle(event)
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
      <SelectButton
        v-model="viewMode"
        :options="viewModeOptions"
        option-label="label"
        option-value="value"
        data-key="value"
        :allow-empty="false"
        aria-label="展示方式"
        class="ww-settings-segment ww-settings-segment--icon"
      >
        <template #option="{ option }">
          <WwIcon
            :name="option.wwIcon"
            size="sm"
            v-tooltip.bottom="option.label"
            :aria-label="option.label"
          />
        </template>
      </SelectButton>
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
      <Menu ref="sortMenu" :model="sortMenuItems" popup class="ww-page-toolbar-menu">
        <template #itemicon="{ item }">
          <WwIcon v-if="item.wwIcon" :name="item.wwIcon" size="sm" class="ww-menu-item-icon" />
        </template>
      </Menu>
    </div>
  </div>
</template>
