<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from 'vue'
import { useRoute } from 'vue-router'
import ModuleSidebar from '@app/components/ModuleSidebar.vue'
import { useRouteModule } from '@app/composables/useRouteModule'
import { useShellModule } from '@app/composables/useShellModule'
import { MODULE_KEEP_ALIVE } from '@app/config/modules'
import { moduleViewComponent } from '@app/shell/moduleShell'
import { mvPageActive } from '@modules/music/lib/musicMvOverlayState'
import { useAppStore } from '@shared/stores/app'
import { useSettingsStore } from '@shared/stores/settings'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'

const ItemDetailView = defineAsyncComponent(
  () => import('@modules/item/ItemDetailView.vue')
)
const MusicMiniBar = defineAsyncComponent(
  () => import('@modules/music/player/MusicMiniBar.vue')
)
const SubItemPanel = defineAsyncComponent(
  () => import('@app/components/SubItemPanel.vue')
)

const route = useRoute()
const routeModule = useRouteModule()
const shellModule = useShellModule()
const shellComponent = computed(() => moduleViewComponent(shellModule.value))
const appStore = useAppStore()
const settingsStore = useSettingsStore()
const isFullscreen = computed(() => !!route.meta.fullscreen)
const minibarHidden = computed(() => mvPageActive.value)
const showMusicBar = computed(
  () => routeModule.value === 'music' && !isFullscreen.value && !minibarHidden.value
)

const isItemDetail = computed(() => isItemDetailRoute(route.name))
/** 模块级 key：修复便笺/音乐等模块串屏（1ed8eac）；全库子路由由 LibraryShellView 内层 key 负责 */
const shellRouterViewKey = computed(() => routeModule.value ?? route.fullPath)
/** 物品详情为全屏内容区：不显示分类侧栏，避免与缓存的全库列表叠在一起 */
const showSubPanel = computed(() => {
  if (isItemDetail.value || isFullscreen.value) return false
  const mod = routeModule.value
  return mod === 'library' || mod === 'rss'
})

watch(
  routeModule,
  (m) => {
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
      class="relative flex min-w-0 flex-1 flex-col overflow-hidden"
      :class="routeModule === 'cloud-abode' ? 'bg-transparent' : 'bg-ww-content'"
    >
      <!-- 底层模块常驻 KeepAlive；物品详情用浮层，避免 out-in 闪白与列表重挂载 -->
      <RouterView :key="shellRouterViewKey" v-slot="{ Component }">
        <KeepAlive :max="4" :include="[...MODULE_KEEP_ALIVE]">
          <component
            :is="isItemDetail ? shellComponent : Component"
            :key="shellModule"
            class="h-full min-h-0 flex flex-1 flex-col"
          />
        </KeepAlive>
      </RouterView>
      <Transition name="ww-item-detail">
        <ItemDetailView v-if="isItemDetail" class="ww-item-detail-layer" />
      </Transition>
      <Transition name="ww-music-minibar">
        <MusicMiniBar v-if="showMusicBar" />
      </Transition>
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

/* 物品详情浮层进入 / 离开 */
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

/* 音乐底栏：沉入窗口底部外，先快后慢 */
.ww-music-minibar-enter-active,
.ww-music-minibar-leave-active {
  transition:
    transform 0.44s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-music-minibar-enter-from,
.ww-music-minibar-leave-to {
  opacity: 0;
  transform: translateY(calc(100% + var(--ww-music-minibar-inset, 1.125rem) + 0.75rem));
}

.ww-music-minibar-enter-to,
.ww-music-minibar-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
