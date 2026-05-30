import * as THREE from 'three'
import type { RenderEngine } from '@renderer/core/RenderEngine'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/vehicles/config/showroomLighting'
import type { ReflectionFloorHandles } from '../types/showroomScene'
import type { ShowroomLightRig } from './showroomRealtimeLights'

/** 配置 SpotLight 投射阴影 */
export function configureShowroomSpotShadow(spot: THREE.SpotLight): void {
  spot.castShadow = true
  spot.shadow.mapSize.set(
    SHOWROOM_LIGHTING.spotShadowMapSize,
    SHOWROOM_LIGHTING.spotShadowMapSize
  )
  spot.shadow.bias = SHOWROOM_LIGHTING.spotShadowBias
  spot.shadow.normalBias = SHOWROOM_LIGHTING.spotShadowNormalBias
  spot.shadow.radius = SHOWROOM_LIGHTING.spotShadowRadius
  spot.shadow.camera.near = 0.4
  spot.shadow.camera.far = SHOWROOM_LIGHTING.spotDistance + 4
  spot.shadow.focus = 1
}

/** 启用渲染器 shadowMap + 地板/车辆阴影标记 */
export function enableShowroomShadows(
  engine: RenderEngine,
  handles: ReflectionFloorHandles,
  vehicleRoot?: THREE.Object3D | null
): void {
  engine.enableShadowMapping()

  handles.floorMesh.receiveShadow = true

  if (vehicleRoot) {
    vehicleRoot.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      if (!mesh.visible) {
        mesh.castShadow = false
        return
      }
      mesh.castShadow = true
    })
  }
}

export function applySpotShadowToRig(rig: ShowroomLightRig | null): void {
  if (!rig) return
  configureShowroomSpotShadow(rig.spot)
}
