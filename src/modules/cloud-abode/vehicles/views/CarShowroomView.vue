<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, ref, watch } from 'vue'
import type { Group } from 'three'
import SceneCanvas from '@renderer/components/SceneCanvas.vue'
import type { SceneRenderer } from '@renderer/core/SceneRenderer'
import { CLOUD_ABODE_SHOWROOM } from '@modules/cloud-abode/config/showroomAssets'
import { assetUrl, vehicleItemAssetUrl } from '@shared/utils/assetUrl'
import ColorBar from '../components/ColorBar.vue'
import ShowroomPreloader from '../components/ShowroomPreloader.vue'
import StateTable from '../components/StateTable.vue'
import ShowroomHud from '../components/ShowroomHud.vue'
import ScreenshotFlash from '../components/ScreenshotFlash.vue'
import { applyBodyColor, setupVehicleMaterials } from '../services/materialBinder'
import {
  applyCustomization,
  collectWheelSpinNodes
} from '../services/vehicleCustomizationBinder'
import { applyShowroomMaterials } from '../services/showroomMaterials'
import {
  attachShowroomFloorReflector,
  enableReflecFloorShader,
  extractShowroomHandles
} from '../services/showroomScene'
import LeftCustomBar from '../components/LeftCustomBar.vue'
import { loadVehicleItem } from '../services/loadVehicleCatalog'
import { useVehicleGarageStore } from '../stores/vehicleGarage'
import { useShowroomPrefsStore } from '../stores/showroomPrefs'
import { useShowroomBgm } from '../composables/useShowroomBgm'
import type { ShowroomViewMode } from '../types/showroom'

const props = defineProps<{
  slug: string
}>()

const garage = useVehicleGarageStore()
const prefs = useShowroomPrefsStore()
const progress = ref(0)
const loading = ref(true)
const error = ref('')
const carRoot = ref<Group | null>(null)
const viewMode = ref<ShowroomViewMode>('customize')
const sceneReady = ref(false)
const screenshotFlash = ref<InstanceType<typeof ScreenshotFlash> | null>(null)

let renderer: SceneRenderer | null = null
let pointerDownAt = 0
let removeCanvasListeners: (() => void) | null = null

const { muted } = storeToRefs(prefs)
const bgmUrl = assetUrl(CLOUD_ABODE_SHOWROOM.bgm)
const { play: playBgm, stop: stopBgm } = useShowroomBgm(bgmUrl, muted)

function bindRushClick(r: SceneRenderer) {
  removeCanvasListeners?.()
  const el = r.domElement
  const onDown = () => {
    pointerDownAt = performance.now()
  }
  const onClick = () => {
    if (performance.now() - pointerDownAt > 280) return
    void (async () => {
      await r.toggleRushMode(assetUrl(CLOUD_ABODE_SHOWROOM.effects.speedLines))
      viewMode.value = r.isRushActive ? 'drive' : 'customize'
    })()
  }
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('click', onClick)
  removeCanvasListeners = () => {
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('click', onClick)
  }
}

async function onReady(r: SceneRenderer) {
  renderer = r
  sceneReady.value = false
  loading.value = true
  error.value = ''
  progress.value = 0
  carRoot.value = null
  viewMode.value = 'customize'

  const item = loadVehicleItem(props.slug)
  if (!item) {
    error.value = '未找到车型配置'
    loading.value = false
    return
  }

  garage.bindVehicle(item)

  try {
    const cfg = garage.config ?? item.customization.defaultConfig
    await r.initDynamicEnvironment(
      assetUrl(CLOUD_ABODE_SHOWROOM.hdrDay),
      assetUrl(CLOUD_ABODE_SHOWROOM.hdrNight)
    )
    const car = await r.loadGltf(vehicleItemAssetUrl(props.slug, item.model.path))
    carRoot.value = car
    r.setVehicleRoot(car)
    const showroom = await r.loadGltf(assetUrl(CLOUD_ABODE_SHOWROOM.sceneGltf))
    await applyShowroomMaterials(showroom, {
      floorNormal: assetUrl(CLOUD_ABODE_SHOWROOM.textures.floorNormal),
      floorRoughness: assetUrl(CLOUD_ABODE_SHOWROOM.textures.floorRoughness),
      showroomAo: assetUrl(CLOUD_ABODE_SHOWROOM.textures.showroomAo),
      showroomLight: assetUrl(CLOUD_ABODE_SHOWROOM.textures.showroomLight)
    })
    const handles = extractShowroomHandles(showroom)
    if (handles) {
      enableReflecFloorShader(handles)
      r.registerShowroom(handles)
      attachShowroomFloorReflector(r, handles)
    }
    const bodyAo = item.textures?.bodyAo
      ? vehicleItemAssetUrl(props.slug, item.textures.bodyAo)
      : undefined
    await setupVehicleMaterials(car, item.customization, cfg.bodyColor, bodyAo)
    applyCustomization(car, item.customization, cfg.wheelId, cfg.liveryId)
    r.setWheelSpinNodes(collectWheelSpinNodes(car))
    r.playShowroomEnter()
    bindRushClick(r)
    sceneReady.value = true
    if (!muted.value) playBgm()
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

function captureScreenshot(): void {
  if (!renderer?.domElement) return
  screenshotFlash.value?.flash()
  requestAnimationFrame(() => {
    const link = document.createElement('a')
    link.download = `wanwu-${props.slug}.png`
    link.href = renderer!.domElement.toDataURL('image/png')
    link.click()
  })
}

watch(muted, (m) => {
  if (!sceneReady.value) return
  if (m) stopBgm()
  else playBgm()
})

watch(viewMode, async (mode) => {
  if (!renderer || !sceneReady.value || loading.value) return
  await renderer.applyViewMode(mode, assetUrl(CLOUD_ABODE_SHOWROOM.effects.speedLines))
})

onBeforeUnmount(() => {
  removeCanvasListeners?.()
  removeCanvasListeners = null
  stopBgm()
})

watch(
  () => garage.config?.bodyColor,
  (color) => {
    if (!color || !carRoot.value || !garage.activeItem) return
    applyBodyColor(carRoot.value, garage.activeItem.customization, color)
  }
)

watch(
  () => [garage.config?.wheelId, garage.config?.liveryId] as const,
  ([wheelId, liveryId]) => {
    if (!carRoot.value || !garage.activeItem || !wheelId || !liveryId) return
    applyCustomization(carRoot.value, garage.activeItem.customization, wheelId, liveryId)
  }
)
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <SceneCanvas
      :key="prefs.quality"
      class="min-h-0 flex-1"
      :quality="prefs.quality"
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
      v-if="!loading && !error"
      class="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-start justify-between px-4"
    >
      <p class="text-xs text-white/50">
        单击画布切换行驶 · 右侧切换展示模式
      </p>
      <ShowroomHud @screenshot="captureScreenshot" />
    </div>
    <ScreenshotFlash ref="screenshotFlash" />
    <p
      v-if="viewMode === 'radar' && !loading"
      class="pointer-events-none absolute inset-x-0 top-14 z-10 text-center text-xs text-cyan-300/80"
    >
      雷达感知（v1 占位视角）
    </p>
    <p
      v-if="viewMode === 'size' && !loading"
      class="pointer-events-none absolute inset-x-0 top-14 z-10 text-center text-xs text-white/60"
    >
      车身尺寸（v1 占位视角）
    </p>
    <div
      v-if="!loading && !error && garage.config && garage.activeItem"
      class="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center"
    >
      <LeftCustomBar
        class="pointer-events-auto"
        :body-color="garage.config.bodyColor"
        :wheel-id="garage.config.wheelId"
        :livery-id="garage.config.liveryId"
        :wheels="garage.activeItem.customization.wheels"
        :liveries="garage.activeItem.customization.liveries"
        @update:body-color="(c) => garage.patchConfig({ bodyColor: c })"
        @update:wheel-id="(id) => garage.patchConfig({ wheelId: id })"
        @update:livery-id="(id) => garage.patchConfig({ liveryId: id })"
      />
    </div>
    <div
      v-if="!loading && !error"
      class="pointer-events-none absolute inset-y-0 right-4 z-10 flex items-center"
    >
      <StateTable
        v-model="viewMode"
        class="pointer-events-auto"
        :disabled="renderer?.isInteractLocked"
      />
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
