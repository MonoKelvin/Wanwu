<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRouteModule } from '@app/composables/useRouteModule'
import { resolveSubPanel } from '@app/modules/subPanelRegistry'

const route = useRoute()
const routeModule = useRouteModule()

const subPanel = computed(() => resolveSubPanel(routeModule.value))
const subPanelComponent = shallowRef<ReturnType<typeof defineAsyncComponent> | null>(null)
const subPanelLoadError = shallowRef(false)

watch(
  subPanel,
  (panel) => {
    subPanelLoadError.value = false
    subPanelComponent.value = panel
      ? defineAsyncComponent({
          loader: () => panel.loadComponent(),
          onError(err, _retry, fail) {
            console.error('[SubItemPanel] 侧栏加载失败:', panel.moduleId, err)
            subPanelLoadError.value = true
            fail()
          }
        })
      : null
  },
  { immediate: true }
)
</script>

<template>
  <aside
    v-if="subPanelComponent && !subPanelLoadError"
    class="ww-subpanel flex w-[var(--ww-subpanel-width)] flex-col overflow-hidden"
    aria-label="分类"
  >
    <header class="ww-chrome-safe px-3 pb-2">
      <h2 class="ww-section-label">{{ route.meta.title }}</h2>
    </header>
    <component :is="subPanelComponent" class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" />
  </aside>
</template>

<style scoped>
.ww-subpanel {
  background: linear-gradient(180deg, var(--ww-panel) 0%, var(--ww-inset) 100%);
  border-right: 1px solid var(--ww-border-subtle);
  box-shadow: var(--ww-panel-edge-highlight);
}

.ww-section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ww-ink-faint);
}
</style>
