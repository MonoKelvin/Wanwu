<script setup lang="ts">
import { computed, ref } from 'vue'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import WwButton from '@shared/components/WwButton.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import WwLiveSyncButton from '@shared/components/WwLiveSyncButton.vue'
import WwViewModeToggle, { type WwViewMode } from '@shared/components/WwViewModeToggle.vue'
import type { WwMenuItem } from '@shared/types/menu'
import { LINKS_SORT_OPTIONS, type LinksSortMode } from '@features/library/links/linksSort'

const search = defineModel<string>('search', { default: '' })
const viewMode = defineModel<WwViewMode>('viewMode', { default: 'list' })
const liveSync = defineModel<boolean>('liveSync', { default: true })
const sortMode = defineModel<LinksSortMode>('sortMode', { required: true })

const props = withDefaults(
  defineProps<{
    syncing?: boolean
    checkingLinks?: boolean
    canCreateFolder?: boolean
    /** 浏览器收藏夹来源才显示同步控件 */
    showBrowserSync?: boolean
    /** 本机是否检测到该浏览器收藏夹文件 */
    browserSyncAvailable?: boolean
  }>(),
  { showBrowserSync: true, browserSyncAvailable: true }
)

const emit = defineEmits<{
  syncFromBrowser: []
  syncToBrowser: []
  add: []
  createFolder: []
  filterUnreachable: []
}>()

const moreMenuOpen = ref(false)
const moreMenu = ref<InstanceType<typeof WwContextMenu> | null>(null)

const moreItems = computed((): WwMenuItem[] => {
  const sortItems: WwMenuItem[] = LINKS_SORT_OPTIONS.map((opt) => ({
    label: opt.label,
    wwIcon: opt.wwIcon,
    class: sortMode.value === opt.value ? 'ww-page-toolbar-menu__item--active' : undefined,
    command: () => {
      sortMode.value = opt.value
    }
  }))

  const syncItems: WwMenuItem[] = props.showBrowserSync
    ? [
        {
          label: '同步到软件',
          wwIcon: 'refresh-cw',
          disabled: () => !!props.syncing || !props.browserSyncAvailable,
          command: () => emit('syncFromBrowser')
        },
        {
          label: '同步到浏览器',
          wwIcon: 'share',
          disabled: () => !!props.syncing || !props.browserSyncAvailable,
          command: () => emit('syncToBrowser')
        },
        { separator: true }
      ]
    : []

  return [
    ...syncItems,
    ...sortItems,
    { separator: true },
    {
      label: '检查无效链接',
      wwIcon: 'circle-alert',
      disabled: () => !!props.syncing || !!props.checkingLinks,
      command: () => emit('filterUnreachable')
    }
  ]
})

function toggleMoreMenu(event: MouseEvent) {
  const anchor = event.currentTarget
  if (!(anchor instanceof HTMLElement)) return
  moreMenu.value?.toggleAnchor(anchor)
}
</script>

<template>
  <div class="ww-page-toolbar ww-page-toolbar--links" role="toolbar" aria-label="链接工具">
    <IconField class="ww-field-search ww-page-toolbar__search ww-page-toolbar__search--links">
      <WwInputIcon name="search" />
      <InputText v-model="search" placeholder="搜索链接…" class="w-full" aria-label="搜索链接" />
    </IconField>

    <div class="ww-page-toolbar__cluster ww-page-toolbar__cluster--nowrap">
      <WwViewModeToggle v-model="viewMode" aria-label="链接展示方式" />
      <WwLiveSyncButton
        v-if="showBrowserSync && browserSyncAvailable"
        v-model="liveSync"
        :syncing="syncing"
      />

      <WwButton
        v-if="canCreateFolder"
        type="button"
        icon="folder-plus"
        size="small"
        variant="outlined"
        severity="secondary"
        aria-label="新建目录"
        v-tooltip.bottom="'新建目录'"
        @click="emit('createFolder')"
      />

      <WwButton
        type="button"
        icon="plus"
        size="small"
        severity="primary"
        aria-label="新增链接"
        v-tooltip.bottom="'新增链接'"
        @click="emit('add')"
      />

      <WwButton
        type="button"
        icon="ellipsis-vertical"
        size="small"
        variant="outlined"
        severity="secondary"
        aria-label="更多操作"
        aria-haspopup="true"
        :aria-expanded="moreMenuOpen"
        v-tooltip.bottom="'更多操作'"
        @click="toggleMoreMenu"
      />
      <WwContextMenu ref="moreMenu" v-model:open="moreMenuOpen" :model="moreItems" />
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

.ww-page-toolbar--links .ww-page-toolbar__search--links {
  width: min(100%, 12.5rem);
}
</style>
