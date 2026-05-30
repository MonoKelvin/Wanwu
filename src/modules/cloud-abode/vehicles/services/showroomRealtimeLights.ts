import * as THREE from 'three'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/vehicles/config/showroomLighting'
import { resolveLightPanelRoot } from './showroomScene'
import { configureShowroomSpotShadow } from './showroomShadows'
import type { ReflectionFloorHandles } from '../types/showroomScene'

export interface ShowroomLightRig {
  rectArea: THREE.RectAreaLight | null
  spot: THREE.SpotLight
  spotTarget: THREE.Object3D
}

let rectLibReady = false

async function ensureRectAreaLibAsync(): Promise<void> {
  if (rectLibReady) return
  const { RectAreaLightUniformsLib } = await import(
    'three/addons/lights/RectAreaLightUniformsLib.js'
  )
  RectAreaLightUniformsLib.init()
  rectLibReady = true
}

/** 实时顶光 + 地面聚光（替代 lightMap 烘焙） */
export async function createShowroomLightRig(
  scene: THREE.Scene,
  handles: ReflectionFloorHandles,
  target = new THREE.Vector3(
    SHOWROOM_LIGHTING.orbitTarget.x,
    SHOWROOM_LIGHTING.orbitTarget.y,
    SHOWROOM_LIGHTING.orbitTarget.z
  )
): Promise<ShowroomLightRig> {
  const lightRoot = resolveLightPanelRoot(handles)
  lightRoot.updateWorldMatrix(true, true)

  let rectArea: THREE.RectAreaLight | null = null
  try {
    await ensureRectAreaLibAsync()
    const box = new THREE.Box3().setFromObject(lightRoot)
    const size = box.getSize(new THREE.Vector3())
    rectArea = new THREE.RectAreaLight(
      0xffffff,
      0,
      Math.max(size.x, 2.8),
      Math.max(size.z, 1.2)
    )
    rectArea.position.set(0, 0, 0)
    lightRoot.add(rectArea)
  } catch (err) {
    console.warn('[showroomRealtimeLights] RectAreaLight 不可用，仅使用 SpotLight', err)
  }

  const spotTarget = new THREE.Object3D()
  spotTarget.position.copy(target)
  scene.add(spotTarget)

  const spot = new THREE.SpotLight(
    0xffffff,
    0,
    SHOWROOM_LIGHTING.spotDistance,
    SHOWROOM_LIGHTING.spotAngle,
    SHOWROOM_LIGHTING.spotPenumbra,
    1
  )
  spot.position.set(
    target.x + SHOWROOM_LIGHTING.spotOffset.x,
    SHOWROOM_LIGHTING.spotHeight,
    target.z + SHOWROOM_LIGHTING.spotOffset.z
  )
  spot.target = spotTarget
  scene.add(spot)
  if (SHOWROOM_LIGHTING.enableSpotShadows) {
    configureShowroomSpotShadow(spot)
  }

  return { rectArea, spot, spotTarget }
}

export function setShowroomLightRigIntensity(rig: ShowroomLightRig | null, amount: number): void {
  if (!rig) return
  const a = THREE.MathUtils.clamp(amount, 0, 1)
  if (rig.rectArea) {
    rig.rectArea.intensity = a * SHOWROOM_LIGHTING.rectAreaLightIntensity
  }
  rig.spot.intensity = a * SHOWROOM_LIGHTING.spotLightIntensity
}

export function syncSpotLightToFloorUniforms(
  rig: ShowroomLightRig | null,
  floorMat: THREE.Material,
  _rigAmount?: number
): void {
  if (!rig) return
  const u = floorMat.userData.reflecFloorUniforms as
    | Record<string, { value: THREE.Vector3 | number }>
    | undefined
  if (!u?.uSpotPosition) return

  rig.spot.updateMatrixWorld()
  rig.spot.target.updateMatrixWorld()

  const pos = rig.spot.getWorldPosition(new THREE.Vector3())
  const target = rig.spot.target.getWorldPosition(new THREE.Vector3())
  const dir = target.clone().sub(pos).normalize()

  ;(u.uSpotPosition.value as THREE.Vector3).copy(pos)
  ;(u.uSpotDirection.value as THREE.Vector3).copy(dir)
  u.uSpotCosOuter.value = Math.cos(rig.spot.angle)
  u.uSpotCosInner.value = Math.cos(rig.spot.angle * (1 - rig.spot.penumbra))
  u.uSpotIntensity.value = rig.spot.intensity
  u.uSpotDistance.value = rig.spot.distance
}

export function disposeShowroomLightRig(
  scene: THREE.Scene,
  rig: ShowroomLightRig | null
): void {
  if (!rig) return
  rig.rectArea?.removeFromParent()
  scene.remove(rig.spot)
  scene.remove(rig.spotTarget)
  rig.spot.target = rig.spotTarget
}
