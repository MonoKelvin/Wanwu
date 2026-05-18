<script setup lang="ts">
import { computed, ref } from 'vue'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Menu from 'primevue/menu'
import SelectButton from 'primevue/selectbutton'
import EmptyState from '@app/components/EmptyState.vue'
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

const viewModeOptions = [
  { label: '卡片', value: 'card' as const, icon: 'pi pi-th-large' },
  { label: '列表', value: 'list' as const, icon: 'pi pi-list' }
]

const sortOptions = [
  { label: '更新时间', value: 'updatedAt' as const, icon: 'pi pi-clock' },
  { label: '添加时间', value: 'createdAt' as const, icon: 'pi pi-calendar-plus' },
  { label: '名称', value: 'name' as const, icon: 'pi pi-sort-alpha-down' }
]

const sortMenu = ref<InstanceType<typeof Menu> | null>(null)

const currentSort = computed(() => sortOptions.find((o) => o.value === sortField.value) ?? sortOptions[0])

const sortMenuItems = computed(() =>
  sortOptions.map((opt) => ({
    label: opt.label,
    icon: opt.icon,
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
      <InputIcon class="pi pi-search" />
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
      <Button
        v-if="listSearch"
        type="button"
        icon="pi pi-times"
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
        class="ww-page-toolbar__segmented"
      >
        <template #option="{ option }">
          <i
            :class="option.icon"
            v-tooltip.bottom="option.label"
            :aria-label="option.label"
          />
        </template>
      </SelectButton>
      <Button
        type="button"
        :icon="currentSort.icon"
        size="small"
        variant="outlined"
        severity="secondary"
        :aria-label="`排序：${currentSort.label}`"
        v-tooltip.bottom="`排序：${currentSort.label}`"
        @click="toggleSortMenu"
      />
      <Menu ref="sortMenu" :model="sortMenuItems" popup class="ww-page-toolbar-menu" />
    </div>
  </div>
</template>
