<script setup lang="ts">
defineOptions({ name: 'CloudAbodeView' })

import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCaScrollEffects } from '@modules/cloud-abode/composables/useCaScrollEffects'
import CaAmbientBg from '@modules/cloud-abode/components/CaAmbientBg.vue'
import CaShellTabs from '@modules/cloud-abode/components/CaShellTabs.vue'
import CaRouteOutlet from '@modules/cloud-abode/components/CaRouteOutlet.vue'
import type { CaNavItem } from '@modules/cloud-abode/shared/caNav'
import { resolveAmbientVideoKey } from '@modules/cloud-abode/shared/caAmbientVideo'
import './styles/cloud-abode.css'
import './styles/cloud-abode-site.css'
import './styles/cloud-abode-decor.css'
import './styles/cloud-abode-fx.css'
import './styles/cloud-abode-motion.css'

const route = useRoute()
const router = useRouter()
const moduleRoot = ref<HTMLElement | null>(null)
const { scrolled, bind, unbind } = useCaScrollEffects(moduleRoot)

const navItems: readonly CaNavItem[] = [
  { name: 'cloud-abode-dashboard', label: '首页', path: '/cloud-abode' },
  { name: 'cloud-abode-mall', label: '商城', path: '/cloud-abode/mall' },
  { name: 'cloud-abode-showroom', label: '展车', path: '/cloud-abode/showroom/xiaomi-su7' },
  { name: 'cloud-abode-todos', label: '任务', path: '/cloud-abode/todos' },
  { name: 'cloud-abode-tools', label: '工具', path: '/cloud-abode/tools' },
  { name: 'cloud-abode-wallet', label: '账本', path: '/cloud-abode/wallet' },
  { name: 'cloud-abode-inventory', label: '收藏', path: '/cloud-abode/inventory' }
]

const activeName = computed(() => {
  const n = route.name
  if (n === 'cloud-abode-mall-detail') return 'cloud-abode-mall'
  if (n === 'cloud-abode-showroom') return 'cloud-abode-showroom'
  return typeof n === 'string' ? n : 'cloud-abode-dashboard'
})

const isShowroom = computed(() => route.name === 'cloud-abode-showroom')

const ambientVariant = computed(() => resolveAmbientVideoKey(route.name))

function go(item: CaNavItem) {
  void router.push(item.path)
}

watch(
  () => route.fullPath,
  async () => {
    if (isShowroom.value) {
      unbind()
      return
    }
    await nextTick()
    const scroll = moduleRoot.value?.querySelector<HTMLElement>('.ww-ca-scroll')
    scroll?.scrollTo({ top: 0 })
    bind()
  },
  { immediate: true }
)
</script>

<template>
  <div ref="moduleRoot" class="ww-ca-web flex h-full min-h-0 flex-col overflow-hidden">
    <header
      v-if="!isShowroom"
      class="ww-ca-shell"
      :class="{ 'ww-ca-shell--scrolled': scrolled }"
    >
      <div class="ww-ca-shell__inner ww-ca-shell__inner--tabs">
        <CaShellTabs :items="navItems" :active-name="activeName" @navigate="go" />
      </div>
    </header>
    <div class="ww-ca-stage min-h-0 min-w-0 flex-1 overflow-hidden">
      <CaAmbientBg v-if="!isShowroom" :variant="ambientVariant" />
      <div class="ww-ca-router min-h-0 min-w-0 flex h-full flex-col overflow-hidden">
        <CaRouteOutlet />
      </div>
    </div>
  </div>
</template>
