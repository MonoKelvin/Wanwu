<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import ModuleSidebar from '@app/components/ModuleSidebar.vue'
import SubItemPanel from '@app/components/SubItemPanel.vue'
import { useRouteModule } from '@app/composables/useRouteModule'
import { useShellModule } from '@app/composables/useShellModule'
import { MODULE_KEEP_ALIVE } from '@app/config/modules'
import { moduleViewComponent } from '@app/shell/moduleShell'
import ItemDetailView from '@features/item/ItemDetailView.vue'
import { useAppStore } from '@shared/stores/app'
import { useSettingsStore } from '@shared/stores/settings'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'

const route = useRoute()
const routeModule = useRouteModule()
const shellModule = useShellModule()
const shellComponent = computed(() => moduleViewComponent(shellModule.value))
const appStore = useAppStore()
const settingsStore = useSettingsStore()

const isItemDetail = computed(() => isItemDetailRoute(route.name))
/** 物品详情为全屏内容区：不显示分类侧栏，避免与缓存的全库列表叠在一起 */
const showSubPanel = computed(() => {
  if (isItemDetail.value) return false
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
    <ModuleSidebar />
    <SubItemPanel v-show="showSubPanel" class="shrink-0" />
    <main class="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-ww-content">
      <!-- 底层模块常驻 KeepAlive；物品详情用浮层，避免 out-in 闪白与列表重挂载 -->
      <RouterView v-slot="{ Component }">
        <KeepAlive :include="[...MODULE_KEEP_ALIVE]">
          <component
            :is="isItemDetail ? shellComponent : Component"
            class="h-full min-h-0 flex flex-1 flex-col"
          />
        </KeepAlive>
      </RouterView>
      <Transition name="ww-item-detail">
        <ItemDetailView v-if="isItemDetail" class="ww-item-detail-layer" />
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
</style>
