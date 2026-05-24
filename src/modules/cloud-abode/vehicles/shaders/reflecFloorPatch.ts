import * as THREE from 'three'
import type { PlanarMeshReflector } from '@renderer/reflection/PlanarMeshReflector'
import { SHOWROOM_SCENE_DEFAULTS } from '@modules/cloud-abode/config/showroomDefaults'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/config/showroomLighting'
import { reflecFloorOutput } from './lygia'

export interface ReflecFloorControls {
  time: number
  speed: number
  reflectIntensity: number
  floorColor: THREE.Color
  floorTintMul?: number
}

/** ReflecFloor — 云斋展厅地板 shader（su7-replica + lygia fresnel） */
export function patchReflecFloorMaterial(
  mat: THREE.MeshPhysicalMaterial,
  controls: ReflecFloorControls
): void {
  const uniforms = {
    uFloorTime: { value: controls.time },
    uFloorSpeed: { value: controls.speed },
    uReflectIntensity: { value: controls.reflectIntensity },
    uFloorTint: { value: controls.floorColor.clone() },
    uFloorTintMul: {
      value: controls.floorTintMul ?? SHOWROOM_SCENE_DEFAULTS.reflectionFloorTintMul
    },
    uReflectMatrix: { value: new THREE.Matrix4() },
    uReflectTexture: { value: null as THREE.Texture | null },
    uMipmapTextureSize: { value: new THREE.Vector2(1024, 1024) }
  }

  mat.envMapIntensity = 0
  mat.lightMapIntensity = 0
  mat.aoMapIntensity = SHOWROOM_LIGHTING.floorAoIntensity

  mat.onBeforeCompile = (shader) => {
    shader.defines ??= {}
    if (mat.lightMap) shader.defines.USE_LIGHTMAP = ''
    if (mat.aoMap) shader.defines.USE_AOMAP = ''

    Object.assign(shader.uniforms, {
      uFloorTime: uniforms.uFloorTime,
      uFloorSpeed: uniforms.uFloorSpeed,
      uReflectIntensity: uniforms.uReflectIntensity,
      uFloorTint: uniforms.uFloorTint,
      uFloorTintMul: uniforms.uFloorTintMul,
      uReflectMatrix: uniforms.uReflectMatrix,
      uReflectTexture: uniforms.uReflectTexture,
      uMipmapTextureSize: uniforms.uMipmapTextureSize
    })

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWorldFloorPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    )
    if (!shader.vertexShader.includes('varying vec3 vWorldFloorPos')) {
      shader.vertexShader = `varying vec3 vWorldFloorPos;\n${shader.vertexShader}`
    }

    shader.fragmentShader = `varying vec3 vWorldFloorPos;
uniform float uFloorTime;
uniform float uFloorSpeed;
uniform float uReflectIntensity;
uniform vec3 uFloorTint;
uniform float uFloorTintMul;
uniform mat4 uReflectMatrix;
uniform sampler2D uReflectTexture;
uniform vec2 uMipmapTextureSize;
${shader.fragmentShader}`

    const floorOutput = reflecFloorOutput
      .replace(
        '__FLOOR_ROUGHNESS_MUL__',
        SHOWROOM_LIGHTING.floorReflectRoughnessMul.toFixed(1)
      )
      .replace(
        '__FLOOR_SPOT_CONTRAST__',
        SHOWROOM_LIGHTING.floorSpotContrast.toFixed(2)
      )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <output_fragment>',
      floorOutput
    )
  }

  mat.customProgramCacheKey = () =>
    `wanwu-reflec-floor-v21-packed-${mat.lightMap ? 'lm' : 'no-lm'}-${mat.aoMap ? 'ao' : 'no-ao'}`
  mat.needsUpdate = true
  mat.userData.reflecFloorUniforms = uniforms
}

export function bindFloorReflector(
  mat: THREE.Material,
  reflector: PlanarMeshReflector
): void {
  const u = mat.userData.reflecFloorUniforms as Record<string, { value: unknown }> | undefined
  if (!u) return
  u.uReflectMatrix.value = reflector.reflectMatrix
  u.uReflectTexture.value = reflector.mipmapTexture
  const size = u.uMipmapTextureSize?.value as THREE.Vector2 | undefined
  if (size) size.set(reflector.resolution, reflector.resolution)
}

export function updateReflecFloorUniforms(
  mat: THREE.Material,
  partial: Partial<ReflecFloorControls>
): void {
  const u = mat.userData.reflecFloorUniforms as Record<string, { value: unknown }> | undefined
  if (!u) return
  if (partial.time !== undefined) u.uFloorTime.value = partial.time
  if (partial.speed !== undefined) u.uFloorSpeed.value = partial.speed
  if (partial.reflectIntensity !== undefined) u.uReflectIntensity.value = partial.reflectIntensity
  if (partial.floorColor !== undefined) (u.uFloorTint.value as THREE.Color).copy(partial.floorColor)
  if (partial.floorTintMul !== undefined) u.uFloorTintMul.value = partial.floorTintMul
}
