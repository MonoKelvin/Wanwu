<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, ref, watch } from 'vue'
import type { Group } from 'three'
import SceneCanvas from '@renderer/components/SceneCanvas.vue'
import type { SceneRenderer } from '@renderer/core/SceneRenderer'
import { CLOUD_ABODE_SHOWROOM } from '@modules/cloud-abode/config/showroomAssets'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/config/showroomLighting'
import { ShowroomDirector } from '../services/showroomDirector'
import { bindShowroomHoldRush } from '../composables/useShowroomHoldRush'
import type { HoldRushBindings } from '../composables/useShowroomHoldRush'
import { assetUrl, vehicleItemAssetUrl } from '@shared/utils/assetUrl'
import ColorBar from '../components/ColorBar.vue'
import ShowroomPreloader from '../components/ShowroomPreloader.vue'
import StateTable from '../components/StateTable.vue'
import ShowroomHud from '../components/ShowroomHud.vue'
import ScreenshotFlash from '../components/ScreenshotFlash.vue'
import { applyBodyColor, prepareVehicleForShowroom } from '../services/vehicleShowroom'
import {
  applyCustomization,
  collectWheelSpinNodes
} from '../services/vehicleCustomizationBinder'
import { applyShowroomMaterials } from '../services/showroomMaterials'
import {
  attachShowroomFloorReflector,
  enableReflecFloorShader,
  extractShowroomHandles,
  prepareShowroomScene
} from '../services/showroomScene'
import { initShowroomDynamicEnvironment } from '../services/showroomEnvironment'
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
const pathTracingActive = ref(false)
const pathTracingSamples = ref(0)
const pathTracingLoading = ref(false)
const pathTracingSupported = ref(false)

let renderer: SceneRenderer | null = null
let director: ShowroomDirector | null = null
let holdRushBindings: HoldRushBindings | null = null
let pathTracingRaf = 0

function stopPathTracingPoll(): void {
  if (pathTracingRaf) cancelAnimationFrame(pathTracingRaf)
  pathTracingRaf = 0
}

function startPathTracingPoll(): void {
  stopPathTracingPoll()
  const tick = () => {
    if (!pathTracingActive.value || !renderer) {
      pathTracingRaf = 0
      return
    }
    pathTracingSamples.value = renderer.engine.pathTracingSamples
    pathTracingRaf = requestAnimationFrame(tick)
  }
  pathTracingRaf = requestAnimationFrame(tick)
}

async function stopPathTracingPreview(): Promise<void> {
  if (!renderer || !pathTracingActive.value) return
  renderer.engine.disablePathTracing()
  renderer.setInteractLocked(false)
  pathTracingActive.value = false
  pathTracingSamples.value = 0
  prefs.setPathTracingPreview(false)
  stopPathTracingPoll()
}

async function togglePathTracingPreview(): Promise<void> {
  if (!renderer || pathTracingLoading.value || !pathTracingSupported.value) return
  const engine = renderer.engine

  if (pathTracingActive.value) {
    await stopPathTracingPreview()
    return
  }

  pathTracingLoading.value = true
  try {
    const ok = await engine.enablePathTracing()
    if (!ok) {
      console.warn('[CarShowroom] 路径追踪不可用', engine.pathTracingError)
      return
    }
    await engine.setPathTracingEnabled(true)
    renderer.setInteractLocked(true)
    pathTracingActive.value = true
    prefs.setPathTracingPreview(true)
    startPathTracingPoll()
  } finally {
    pathTracingLoading.value = false
  }
}

function disposeCanvasInteraction(): void {
  holdRushBindings?.dispose()
  holdRushBindings = null
}

const { muted } = storeToRefs(prefs)
const { config: garageConfig, activeItem: garageItem } = storeToRefs(garage)
const bgmUrl = assetUrl(CLOUD_ABODE_SHOWROOM.bgm)
const { play: playBgm, stop: stopBgm } = useShowroomBgm(bgmUrl, muted)

function onBodyColorChange(color: string): void {
  garage.patchConfig({ bodyColor: color })
  if (!carRoot.value) return
  applyBodyColor(
    carRoot.value,
    color,
    garageItem.value?.customization.paintMeshes
  )
}

async function onReady(r: SceneRenderer) {
  loading.value = true
  error.value = ''
  progress.value = 0

  try {
    disposeCanvasInteraction()
    try {
      director?.dispose()
    } catch (e) {
      console.warn('[CarShowroom] 清理旧 director 失败', e)
    }
    director = null

    renderer = r
    director = new ShowroomDirector(r.engine, {
      reflectionFloorTintMul: SHOWROOM_LIGHTING.floorTintMul
    })
    pathTracingSupported.value = r.engine.capabilities.pathTracing
    pathTracingActive.value = false
    pathTracingSamples.value = 0
    stopPathTracingPoll()
    r.storeBloomRest(
      SHOWROOM_LIGHTING.bloomIntensity,
      SHOWROOM_LIGHTING.bloomLuminanceSmoothing
    )
    r.setBloomIntensity(SHOWROOM_LIGHTING.bloomIntensity)
    r.setBloomSmoothing(SHOWROOM_LIGHTING.bloomLuminanceSmoothing)
    r.setCameraFov(SHOWROOM_LIGHTING.cameraFov)
    r.engine.controls.target.set(
      SHOWROOM_LIGHTING.orbitTarget.x,
      SHOWROOM_LIGHTING.orbitTarget.y,
      SHOWROOM_LIGHTING.orbitTarget.z
    )
    r.engine.threeCamera.position.set(0, 0.8, -7)
    r.engine.syncOrbitControls()
    r.resize()

    sceneReady.value = false
    carRoot.value = null
    viewMode.value = 'customize'

    const item = loadVehicleItem(props.slug)
    if (!item) {
      error.value = '未找到车型配置'
      return
    }

    garage.bindVehicle(item)

    const fail = (step: string, e: unknown): never => {
      console.error(`[CarShowroom] 失败步骤: ${step}`, e)
      if (e instanceof Error) {
        throw new Error(`${step}: ${e.message}`, { cause: e })
      }
      throw new Error(`${step}: ${String(e)}`)
    }

    const cfg = garage.config ?? item.customization.defaultConfig
    await initShowroomDynamicEnvironment(
      r.engine,
      assetUrl(CLOUD_ABODE_SHOWROOM.hdrDay),
      assetUrl(CLOUD_ABODE_SHOWROOM.hdrNight),
      { fallbackIntensity: SHOWROOM_LIGHTING.envIntensity }
    ).catch((e) => fail('initShowroomDynamicEnvironment', e))
    const car = await r.loadGltf(vehicleItemAssetUrl(props.slug, item.model.path)).catch((e) =>
      fail('loadGltf(vehicle)', e)
    )
    carRoot.value = car
    director.bindVehicle(car)
    const showroom = await r.loadGltf(assetUrl(CLOUD_ABODE_SHOWROOM.sceneGltf)).catch((e) =>
      fail('loadGltf(showroom)', e)
    )
    prepareShowroomScene(showroom)
    await applyShowroomMaterials(showroom, {
      floorNormal: assetUrl(CLOUD_ABODE_SHOWROOM.textures.floorNormal),
      floorRoughness: assetUrl(CLOUD_ABODE_SHOWROOM.textures.floorRoughness),
      showroomAo: assetUrl(CLOUD_ABODE_SHOWROOM.textures.showroomAo),
      showroomLight: assetUrl(CLOUD_ABODE_SHOWROOM.textures.showroomLight)
    }).catch((e) => fail('applyShowroomMaterials', e))
    const handles = extractShowroomHandles(showroom)
    const bodyAo = item.textures?.bodyAo
      ? vehicleItemAssetUrl(props.slug, item.textures.bodyAo)
      : undefined
    await prepareVehicleForShowroom(car, {
      bodyColor: cfg.bodyColor,
      bodyAoUrl: bodyAo,
      paintMeshes: item.customization.paintMeshes
    })
    applyCustomization(car, item.customization, cfg.wheelId, cfg.liveryId)
    if (handles) {
      enableReflecFloorShader(handles, SHOWROOM_LIGHTING.floorTintMul)
      attachShowroomFloorReflector(r.engine, handles, car)
      director.bindShowroom(handles)
      await director.initLightRig(handles)
      director.playEnter(handles)
    } else {
      console.error('[CarShowroom] 未找到展厅 floor/light 句柄，聚光与反射不可用')
    }
    director.setSpinTargets(collectWheelSpinNodes(car))
    disposeCanvasInteraction()
    holdRushBindings = bindShowroomHoldRush(r.engine, director, viewMode)
    sceneReady.value = true
    if (!muted.value) playBgm()
    if (prefs.pathTracingPreview && pathTracingSupported.value) {
      void togglePathTracingPreview()
    }
  } catch (e) {
    const base = e instanceof Error ? e.message : '3D 资源加载失败，请检查云斋资源是否已拷贝齐全'
    const stack =
      e instanceof Error && e.stack ? `\n${e.stack.split('\n').slice(0, 10).join('\n')}` : ''
    console.error('[CarShowroom] 加载失败', e)
    error.value = `${base}${stack}`
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

watch(viewMode, async (mode, prev) => {
  if (!director || !sceneReady.value || loading.value) return
  if (prev === 'drive' && mode !== 'drive' && director.isRushActive) {
    director.endHoldDrive()
  }
  if (mode === 'drive' && !director.isRushActive) {
    await director.applyViewMode('drive')
    return
  }
  if (mode !== 'drive') {
    await director.applyViewMode(mode)
  }
})

onBeforeUnmount(() => {
  disposeCanvasInteraction()
  void stopPathTracingPreview()
  director?.dispose()
  director = null
  stopBgm()
})

watch(
  () => garageConfig.value?.bodyColor,
  (color) => {
    if (!color || !carRoot.value) return
    applyBodyColor(
      carRoot.value,
      color,
      garageItem.value?.customization.paintMeshes
    )
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
      :exposure="SHOWROOM_LIGHTING.toneMappingExposure"
      :bloom-intensity="SHOWROOM_LIGHTING.bloomIntensity"
      :bloom-luminance-smoothing="SHOWROOM_LIGHTING.bloomLuminanceSmoothing"
      :bloom-luminance-threshold="SHOWROOM_LIGHTING.bloomLuminanceThreshold"
      :enable-ssr="SHOWROOM_LIGHTING.enableSSR"
      :enable-ssao="SHOWROOM_LIGHTING.enableSSAO"
      :ssr-intensity="SHOWROOM_LIGHTING.ssrIntensity"
      :enable-tone-mapping="true"
      :cinematic="SHOWROOM_LIGHTING.cinematic"
      :enable-smaa="SHOWROOM_LIGHTING.enableSMAA"
      :enable-cinematic-grade="SHOWROOM_LIGHTING.enableCinematicGrade"
      :enable-temporal-a-a="SHOWROOM_LIGHTING.enableTemporalAA"
      @ready="onReady"
      @progress="onProgress"
      @error="(msg) => { error = msg; loading = false }"
    />
    <ShowroomPreloader :visible="loading" :progress="progress" />
    <div
      v-if="error && !loading"
      class="ww-showroom-error absolute inset-0 z-10 flex items-center justify-center p-6 text-center"
    >
      {{ error }}
    </div>
    <ScreenshotFlash ref="screenshotFlash" />
    <div v-if="!loading && !error" class="ww-showroom-overlay absolute inset-0 z-10">
      <header class="ww-showroom-layout__top ww-showroom-layout__top--tools">
        <ShowroomHud
          :path-tracing-supported="pathTracingSupported"
          :path-tracing-active="pathTracingActive"
          :path-tracing-samples="pathTracingSamples"
          :path-tracing-loading="pathTracingLoading"
          @screenshot="captureScreenshot"
          @path-tracing-toggle="togglePathTracingPreview"
        />
      </header>

      <p
        v-if="viewMode === 'radar'"
        class="ww-showroom-layout__banner ww-showroom-layout__banner--accent"
      >
        雷达感知（v1 占位视角）
      </p>
      <p v-if="viewMode === 'size'" class="ww-showroom-layout__banner">
        车身尺寸（v1 占位视角）
      </p>

      <div class="ww-showroom-layout__side ww-showroom-layout__side--right">
        <StateTable
          v-model="viewMode"
          class="ww-showroom-interactive"
          :disabled="false"
        />
      </div>

      <div
        v-if="garage.config"
        class="ww-showroom-layout__bottom"
      >
        <ColorBar
          class="ww-showroom-interactive"
          :model-value="garage.config.bodyColor"
          @update:model-value="onBodyColorChange"
        />
      </div>
    </div>
  </div>
</template>
