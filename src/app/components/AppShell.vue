<script setup lang="ts">
import {
  KeepAlive,
  computed,
  defineAsyncComponent,
  shallowRef,
  watch,
  type Component
} from 'vue'
import { RouterView, useRoute } from 'vue-router'
import ModuleSidebar from '@app/components/ModuleSidebar.vue'
import SubItemPanel from '@app/components/SubItemPanel.vue'
import { useRouteModule } from '@app/composables/useRouteModule'
import { useShellModule } from '@app/composables/useShellModule'
import { moduleViewComponent } from '@app/shell/moduleShell'
import { loadItemDetailView } from '@app/modules/moduleRegistry'
import { resolveShellOutlet } from '@app/modules/shellOutletRegistry'
import { collectVisibleShellChrome } from '@app/modules/shellChromeRegistry'
import { resolveShellMainClass } from '@app/modules/shellThemeRegistry'
import { moduleHasSubPanel } from '@app/modules/subPanelRegistry'
import { useAppStore } from '@shared/stores/app'
import { useSettingsStore } from '@shared/stores/settings'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'

const route = useRoute()
const routeModule = useRouteModule()
const shellModule = useShellModule()
const appStore = useAppStore()
const settingsStore = useSettingsStore()

const isItemDetail = computed(() => isItemDetailRoute(route.name))
const isFullscreen = computed(() => !!route.meta.fullscreen)
const shellMainClass = computed(() => resolveShellMainClass(routeModule.value))

const activeShellOutlet = computed(() => resolveShellOutlet(route))
const shellOutletComponent = shallowRef<Component | null>(null)

watch(
  activeShellOutlet,
  (outlet, prev) => {
    shellOutletComponent.value = outlet
      ? defineAsyncComponent({
          loader: () => outlet.loadComponent(),
          onError(err, _retry, fail) {
            console.error('[AppShell] shell outlet 加载失败:', outlet.id, err)
            fail()
          }
        })
      : null
    if (prev?.keepAliveInclude && !outlet) {
      appStore.bumpShellOutlet()
    }
  },
  { immediate: true }
)

const itemDetailLoader = loadItemDetailView()
const ItemDetailView = itemDetailLoader ? defineAsyncComponent(itemDetailLoader) : null
const itemDetailShell = computed(() => moduleViewComponent(shellModule.value))

const shellOutletKey = computed(() => {
  if (activeShellOutlet.value?.getActiveShellKey) {
    return activeShellOutlet.value.getActiveShellKey(route)
  }
  if (isItemDetail.value) return `item:${shellModule.value}`
  const mod = routeModule.value
  if (mod === 'library') return `library#${appStore.shellOutletRevision}`
  return `${mod ?? 'app'}:${route.fullPath}#${appStore.shellOutletRevision}`
})

const shellChromeCtx = computed(() => ({
  route,
  routeModule: routeModule.value,
  isFullscreen: isFullscreen.value
}))

const shellChromeItems = computed(() => collectVisibleShellChrome(shellChromeCtx.value))
const shellChromeComponents = shallowRef<Record<string, Component>>({})

watch(
  shellChromeItems,
  (items) => {
    const next: Record<string, Component> = {}
    for (const item of items) {
      next[item.id] = defineAsyncComponent(() => item.loadComponent())
    }
    shellChromeComponents.value = next
  },
  { immediate: true }
)

const showSubPanel = computed(() => {
  if (isItemDetail.value || isFullscreen.value || route.meta.hideSubPanel) return false
  return routeModule.value ? moduleHasSubPanel(routeModule.value) : false
})

watch(
  routeModule,
  (m, prev) => {
    if (m && prev && m !== prev) {
      appStore.bumpShellOutlet()
    }
    if (!m) return
    appStore.setModule(m)
    if (settingsStore.loaded) void settingsStore.patchLastActiveModule(m)
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-full w-full overflow-hidden bg-ww-canvas text-color">
    <ModuleSidebar v-show="!isFullscreen" />
    <SubItemPanel v-if="showSubPanel" class="shrink-0" />
    <main
      :key="`shell-${shellOutletKey}`"
      class="relative flex min-w-0 flex-1 flex-col overflow-hidden"
      :class="shellMainClass"
    >
      <KeepAlive
        v-if="shellOutletComponent && activeShellOutlet?.keepAliveInclude"
        :include="activeShellOutlet.keepAliveInclude"
      >
        <component
          :is="shellOutletComponent"
          :key="shellOutletKey"
          class="h-full min-h-0 flex flex-1 flex-col"
        />
      </KeepAlive>
      <component
        v-else-if="shellOutletComponent"
        :is="shellOutletComponent"
        :key="shellOutletKey"
        class="h-full min-h-0 flex flex-1 flex-col"
      />
      <template v-else-if="isItemDetail && ItemDetailView">
        <component
          :is="itemDetailShell"
          :key="shellOutletKey"
          class="h-full min-h-0 flex flex-1 flex-col"
        />
        <Transition name="ww-item-detail">
          <ItemDetailView class="ww-item-detail-layer" />
        </Transition>
      </template>
      <RouterView v-else :key="shellOutletKey" class="h-full min-h-0 flex flex-1 flex-col" />
      <template v-for="chrome in shellChromeItems" :key="chrome.id">
        <Transition v-if="chrome.transitionName" :name="chrome.transitionName">
          <component :is="shellChromeComponents[chrome.id]" />
        </Transition>
        <component v-else :is="shellChromeComponents[chrome.id]" />
      </template>
    </main>
  </div>
</template>

<style>
.ww-item-detail-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--ww-content);
}

.ww-item-detail-enter-active {
  transition:
    opacity var(--ww-duration-slow) var(--ww-ease-out-slow),
    transform var(--ww-duration-slow) var(--ww-ease-out-slow);
}

.ww-item-detail-leave-active {
  transition:
    opacity var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out);
}

.ww-item-detail-enter-from,
.ww-item-detail-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
