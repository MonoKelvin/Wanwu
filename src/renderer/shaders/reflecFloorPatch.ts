import * as THREE from 'three'
import type { PlanarMeshReflector } from '../reflection/PlanarMeshReflector'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/config/showroomLighting'

export interface ReflecFloorControls {
  time: number
  speed: number
  reflectIntensity: number
  floorColor: THREE.Color
  floorTintMul?: number
  reflectMix?: number
}

/**
 * ReflecFloor 自定义输出（对标 su7 frag.glsl）
 * 不走标准 PBR outgoingLight，避免环境光 + lightMap 把整片地板打亮。
 * 聚光感：暗底 × lightMap 遮罩 × 粗糙度模糊反射 × 菲涅尔混合。
 */
export function patchReflecFloorMaterial(
  mat: THREE.MeshPhysicalMaterial,
  controls: ReflecFloorControls
): void {
  const floorRoughnessMul = SHOWROOM_LIGHTING.floorReflectRoughnessMul
  const floorSpotContrast = SHOWROOM_LIGHTING.floorSpotContrast

  const uniforms = {
    uFloorTime: { value: controls.time },
    uFloorSpeed: { value: controls.speed },
    uReflectIntensity: { value: controls.reflectIntensity },
    uReflectMix: {
      value: controls.reflectMix ?? SHOWROOM_LIGHTING.floorReflectMix
    },
    uFloorTint: { value: controls.floorColor.clone() },
    uFloorTintMul: {
      value: controls.floorTintMul ?? SHOWROOM_LIGHTING.floorTintMul
    },
    uFloorSpotContrast: { value: floorSpotContrast },
    uFloorRoughnessMul: { value: floorRoughnessMul },
    uReflectMatrix: { value: new THREE.Matrix4() },
    uReflectTexture: { value: null as THREE.Texture | null }
  }

  mat.envMapIntensity = 0
  mat.lightMapIntensity = 0
  mat.aoMapIntensity = 0.85

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uFloorTime: uniforms.uFloorTime,
      uFloorSpeed: uniforms.uFloorSpeed,
      uReflectIntensity: uniforms.uReflectIntensity,
      uReflectMix: uniforms.uReflectMix,
      uFloorTint: uniforms.uFloorTint,
      uFloorTintMul: uniforms.uFloorTintMul,
      uFloorSpotContrast: uniforms.uFloorSpotContrast,
      uFloorRoughnessMul: uniforms.uFloorRoughnessMul,
      uReflectMatrix: uniforms.uReflectMatrix,
      uReflectTexture: uniforms.uReflectTexture
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
uniform float uReflectMix;
uniform vec3 uFloorTint;
uniform float uFloorTintMul;
uniform float uFloorSpotContrast;
uniform float uFloorRoughnessMul;
uniform mat4 uReflectMatrix;
uniform sampler2D uReflectTexture;
${shader.fragmentShader}`

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      vec2 scrollUv = vWorldFloorPos.xz;
      scrollUv.x += uFloorTime * uFloorSpeed;
      #ifdef USE_NORMALMAP
        vec3 scrollN = texture2D(normalMap, scrollUv).xyz * 2.0 - 1.0;
        scrollN = scrollN.rbg;
        normal = normalize(normal + scrollN * 0.28);
      #endif`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <output_fragment>',
      `vec3 viewDir = normalize(vViewPosition);
      float d = max(length(viewDir), 0.001);
      vec2 distortion = normal.xz * (0.001 + 1.0 / d);
      vec4 reflectPoint = uReflectMatrix * vec4(vWorldFloorPos, 1.0);
      reflectPoint.xyz /= max(reflectPoint.w, 0.0001);
      vec2 reflectUv = clamp(reflectPoint.xy + distortion, 0.001, 0.999);

      vec2 roughnessUv = vWorldFloorPos.xz;
      roughnessUv.x += uFloorTime * uFloorSpeed;
      float roughnessValue = 0.35;
      #ifdef USE_ROUGHNESSMAP
        roughnessValue = texture2D(roughnessMap, roughnessUv).r;
      #endif
      roughnessValue = roughnessValue * (1.7 - 0.7 * roughnessValue);
      float lodLevel = roughnessValue * uFloorRoughnessMul;

      vec3 reflectionSample;
      #ifdef GL_EXT_shader_texture_lod
        reflectionSample = texture2DLodEXT(uReflectTexture, reflectUv, lodLevel).rgb;
      #else
        reflectionSample = texture2D(uReflectTexture, reflectUv).rgb;
      #endif
      reflectionSample *= uReflectIntensity;

      vec3 col = uFloorTint * uFloorTintMul;
      #ifdef USE_LIGHTMAP
        float spot = max(texture2D(lightMap, vUv2).r, texture2D(lightMap, vUv2).g);
        spot = pow(clamp(spot, 0.0, 1.0), uFloorSpotContrast);
        col *= spot;
      #else
        col *= 0.08;
      #endif
      #ifdef USE_AOMAP
        col *= texture2D(aoMap, vUv2).rgb;
      #endif

      float fres = pow(1.0 - max(dot(normalize(normal), viewDir), 0.0), 2.6);
      float reflectMix = uReflectIntensity > 0.01 ? fres * uReflectMix : 0.0;
      col = mix(col, reflectionSample, reflectMix);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor = vec4(col, 1.0);`
    )
  }

  mat.customProgramCacheKey = () => 'wanwu-reflec-floor-v4'
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
  if (partial.reflectMix !== undefined) u.uReflectMix.value = partial.reflectMix
  if (partial.floorColor !== undefined) (u.uFloorTint.value as THREE.Color).copy(partial.floorColor)
  if (partial.floorTintMul !== undefined) u.uFloorTintMul.value = partial.floorTintMul
}
