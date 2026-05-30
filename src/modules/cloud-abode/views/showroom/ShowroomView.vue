<script setup lang="ts">
defineOptions({ name: 'ShowroomView' })

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CarShowroomView from '@modules/cloud-abode/vehicles/views/CarShowroomView.vue'
import { getVehicleCatalog, vehicleDisplayName } from '@modules/cloud-abode/vehicles/services/loadVehicleCatalog'

const route = useRoute()
const router = useRouter()
const catalog = getVehicleCatalog()

const slug = computed(() => {
  const param = route.params.slug as string | undefined
  return param || catalog.vehicles[0]?.slug || 'xiaomi-su7'
})

const owned = ref(false)
const ownershipLoading = ref(true)

async function refreshOwnership() {
  ownershipLoading.value = true
  try {
    owned.value = await window.wanwu.cloudAbode.ownsVehicleSlug(slug.value)
  } finally {
    ownershipLoading.value = false
  }
}

watch(slug, () => void refreshOwnership(), { immediate: true })
onMounted(() => void refreshOwnership())

watch(
  () => route.params.slug,
  (param) => {
    if (!param && catalog.vehicles[0]) {
      void router.replace({
        name: 'cloud-abode-showroom',
        params: { slug: catalog.vehicles[0].slug }
      })
    }
  },
  { immediate: true }
)

function openVehicle(nextSlug: string) {
  if (nextSlug === slug.value) return
  void router.push({ name: 'cloud-abode-showroom', params: { slug: nextSlug } })
}

function goMall() {
  void router.push({ name: 'cloud-abode-mall', query: { category: 'VEHICLE' } })
}

function goHome() {
  void router.push({ name: 'cloud-abode-dashboard' })
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-ww-canvas">
    <header class="ww-ca-showroom-bar ww-glass-surface--bar">
      <nav class="ww-ca-showroom-bar__tabs" aria-label="车型">
        <button type="button" class="ww-ca-showroom-bar__tab" @click="goHome">云斋</button>
        <button
          v-for="v in catalog.vehicles"
          :key="v.id"
          type="button"
          class="ww-ca-showroom-bar__tab"
          :class="{ 'ww-ca-showroom-bar__tab--active': v.slug === slug }"
          @click="openVehicle(v.slug)"
        >
          {{ vehicleDisplayName(v.slug) }}
        </button>
      </nav>
      <div v-if="!ownershipLoading">
        <span v-if="owned" class="ww-ca-showroom-bar__owned">已拥有</span>
        <button v-else type="button" class="ww-ca-showroom-bar__buy" @click="goMall">
          未拥有 · 去商城购买
        </button>
      </div>
    </header>
    <CarShowroomView :key="slug" class="min-h-0 min-w-0 flex-1" :slug="slug" :owned="owned" />
  </div>
</template>
