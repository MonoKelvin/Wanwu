<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { useSettingsStore } from '@shared/stores/settings'
import { wwMenuItemHasCheckColumn, type WwMenuItem } from '@shared/types/menu'
import type { QuickAccessTrayStatus } from '@shared/types/quickAccess'
import { readRssTrayCounts } from '@modules/quick-access/domain/trayStatus'
import type { TrayMenuAction } from '@shared/types/trayMenu'

const panelRef = ref<HTMLElement | null>(null)
const status = ref<QuickAccessTrayStatus | null>(null)
const dailyWidgetOpen = ref(false)

const menuItems = ref<WwMenuItem[]>([])

function buildMenuItems(): WwMenuItem[] {
  const s = status.value
  const dailyLabel = s?.daily
    ? `今日一物：${s.daily.name}`
    : '今日一物：（图鉴未就绪）'
  const { entryCount, feedCount } = s ? readRssTrayCounts(s) : { entryCount: 0, feedCount: 0 }
  const rssLabel =
    feedCount > 0 ? `RSS 文章 ${entryCount} 篇 / ${feedCount} 源` : 'RSS：暂无订阅'

  return [
    {
      label: dailyLabel,
      wwIcon: 'sparkles',
      disabled: !s?.daily,
      command: () => runAction('open-daily')
    },
    {
      label: rssLabel,
      wwIcon: 'inbox',
      disabled: feedCount <= 0,
      command: () => runAction('open-rss')
    },
    { separator: true },
    {
      label: '打开主窗口',
      wwIcon: 'app-window',
      command: () => runAction('focus-main')
    },
    {
      label: dailyWidgetOpen.value ? '关闭日签小窗' : '显示日签小窗',
      wwIcon: 'image',
      command: () => runAction('toggle-daily-widget')
    },
    {
      label: '全局搜索',
      wwIcon: 'search',
      command: () => runAction('toggle-palette')
    },
    { separator: true },
    {
      label: '退出万物',
      wwIcon: 'x',
      class: 'ww-tray-menu__danger',
      command: () => runAction('quit')
    }
  ]
}

function itemDisabled(item: WwMenuItem): boolean {
  const disabled = item.disabled
  return typeof disabled === 'function' ? disabled() : Boolean(disabled)
}

function runItem(item: WwMenuItem, event: MouseEvent) {
  if (itemDisabled(item)) return
  item.command?.({ originalEvent: event, item })
}

async function runAction(action: TrayMenuAction) {
  await window.wanwu?.quickAccess?.trayMenuAction(action)
}

async function refreshMenu() {
  const api = window.wanwu?.quickAccess
  if (!api) return
  const [trayStatus, ctx] = await Promise.all([api.getTrayStatus(), api.getTrayMenuContext()])
  status.value = trayStatus
  dailyWidgetOpen.value = ctx.dailyWidgetOpen
  menuItems.value = buildMenuItems()
  await nextTick()
  await reportLayout()
}

function waitLayoutFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function reportLayout() {
  const panel = panelRef.value
  if (!panel) return
  await waitLayoutFrame()
  const rect = panel.getBoundingClientRect()
  const width = Math.ceil(panel.offsetWidth || rect.width)
  const height = Math.ceil(panel.offsetHeight || rect.height)
  if (width < 1 || height < 1) return
  await window.wanwu?.quickAccess?.reportTrayMenuLayout({ width, height })
}

let stopTrayMenuShow: (() => void) | undefined

onMounted(async () => {
  document.documentElement.classList.add('ww-tray-menu-root')

  const settingsStore = useSettingsStore()
  if (!settingsStore.loaded) await settingsStore.load()

  stopTrayMenuShow = window.wanwu?.quickAccess?.onTrayMenuShow(() => {
    void refreshMenu()
  })

  await refreshMenu()
})

onUnmounted(() => {
  stopTrayMenuShow?.()
})
</script>

<template>
  <nav ref="panelRef" class="ww-action-menu ww-tray-menu-panel" role="menu">
      <template v-for="(item, index) in menuItems" :key="index">
        <hr v-if="item.separator" class="ww-action-menu__sep" />
        <button
          v-else
          type="button"
          role="menuitem"
          class="ww-action-menu__item"
          :class="[item.class, { 'is-disabled': itemDisabled(item) }]"
          :disabled="itemDisabled(item)"
          @click="runItem(item, $event)"
        >
          <span
            v-if="wwMenuItemHasCheckColumn(item)"
            class="ww-action-menu__check"
            aria-hidden="true"
          >
            <WwIcon v-if="item.checked" name="check" size="sm" />
          </span>
          <WwIcon v-if="item.wwIcon" :name="item.wwIcon" size="sm" />
          <span class="ww-action-menu__label">{{ item.label }}</span>
        </button>
      </template>
  </nav>
</template>

<style>
.ww-tray-menu-panel.ww-action-menu {
  position: static;
  z-index: auto;
  display: flex;
  flex-direction: column;
  width: max-content;
  min-width: 10.5rem;
  max-width: 18rem;
  margin: 0;
  padding: 0.375rem;
  border: 1px solid var(--ww-glass-border);
  border-radius: 0;
  background: var(--ww-elevated);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.ww-tray-menu-panel .ww-action-menu__item {
  border-radius: 0.375rem;
}

.ww-tray-menu__danger .ww-action-menu__label {
  color: var(--ww-toast-error);
}
</style>
