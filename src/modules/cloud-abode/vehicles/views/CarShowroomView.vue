<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Group } from 'three'
import SceneCanvas from '@modules/scene-renderer/components/SceneCanvas.vue'
import type { SceneRenderer } from '@modules/scene-renderer/core/SceneRenderer'
import { CLOUD_ABODE_SHOWROOM } from '@modules/cloud-abode/config/showroomAssets'
import { assetUrl, vehicleItemAssetUrl } from '@shared/utils/assetUrl'
import ColorBar from '../components/ColorBar.vue'
import ShowroomPreloader from '../components/ShowroomPreloader.vue'
import { applyBodyColor } from '../services/materialBinder'
import { loadVehicleItem } from '../services/loadVehicleCatalog'
import { useVehicleGarageStore } from '../stores/vehicleGarage'

const props = defineProps<{
  slug: string
}>()

const garage = useVehicleGarageStore()
const progress = ref(0)
const loading = ref(true)
const error = ref('')
const carRoot = ref<Group | null>(null)

let renderer: SceneRenderer | null = null

async function onReady(r: SceneRenderer) {
  renderer = r
  loading.value = true
  error.value = ''
  progress.value = 0
  carRoot.value = null

  const item = loadVehicleItem(props.slug)
  if (!item) {
    error.value = '未找到车型配置'
    loading.value = false
    return
  }

  garage.bindVehicle(item)

  try {
    await r.setEnvironmentHdr(assetUrl(CLOUD_ABODE_SHOWROOM.hdrDay))
    const car = await r.loadGltf(vehicleItemAssetUrl(props.slug, item.model.path))
    carRoot.value = car
    await r.loadGltf(assetUrl(CLOUD_ABODE_SHOWROOM.sceneGltf))
    const cfg = garage.config
    if (cfg) applyBodyColor(car, item.customization, cfg.bodyColor)
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : '3D 资源加载失败，请检查云斋资源是否已拷贝齐全'
  } finally {
    loading.value = false
  }
}

function onProgress(ratio: number) {
  progress.value = ratio
}

watch(
  () => garage.config?.bodyColor,
  (color) => {
    if (!color || !carRoot.value || !garage.activeItem) return
    applyBodyColor(carRoot.value, garage.activeItem.customization, color)
  }
)

</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <SceneCanvas
      class="min-h-0 flex-1"
      @ready="onReady"
      @progress="onProgress"
      @error="(msg) => { error = msg; loading = false }"
    />
    <ShowroomPreloader :visible="loading" :progress="progress" />
    <div
      v-if="error && !loading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-6 text-center text-sm text-red-300"
    >
      {{ error }}
    </div>
    <div
      v-if="!loading && !error && garage.config"
      class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-8"
    >
      <ColorBar
        class="pointer-events-auto"
        :model-value="garage.config.bodyColor"
        @update:model-value="(c) => garage.patchConfig({ bodyColor: c })"
      />
    </div>
  </div>
</template>
