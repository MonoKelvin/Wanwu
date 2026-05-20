<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import ModuleSidebar from '@app/components/ModuleSidebar.vue'
import SubItemPanel from '@app/components/SubItemPanel.vue'
import { isModuleId } from '@app/config/modules'
import { useAppStore, type ModuleId } from '@shared/stores/app'
import { useSettingsStore } from '@shared/stores/settings'

const route = useRoute()
const appStore = useAppStore()
const settingsStore = useSettingsStore()

const isItemDetail = computed(() => route.name === 'item-detail')
const showSubPanel = computed(
  () => !isItemDetail.value && ['library', 'rss'].includes(route.meta.module as string)
)

watch(
  () => route.meta.module as string | undefined,
  (m) => {
    if (m && isModuleId(m)) {
      appStore.setModule(m)
      if (settingsStore.loaded) void settingsStore.patchLastActiveModule(m)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-full w-full overflow-hidden bg-ww-canvas text-color">
    <ModuleSidebar />
    <template v-if="!isItemDetail">
      <SubItemPanel v-if="showSubPanel" class="shrink-0" />
      <main class="flex min-w-0 flex-1 flex-col overflow-hidden bg-ww-content">
        <RouterView v-slot="{ Component }">
          <Transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </template>
    <main v-else class="flex min-w-0 flex-1 flex-col overflow-hidden bg-ww-content">
      <RouterView />
    </main>
  </div>
</template>
