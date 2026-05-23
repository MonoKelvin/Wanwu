import {
  BloomEffect,
  BlendFunction,
  EffectComposer,
  EffectPass,
  RenderPass
} from 'postprocessing'
import type { Camera, Scene, WebGLRenderer } from 'three'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/config/showroomLighting'
import type { SceneQuality } from '../types'

export interface PostComposerBundle {
  composer: EffectComposer
  bloom: BloomEffect
}

/** Bloom 后期（对标 su7-replica Postprocessing.ts） */
export function createPostComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  quality: SceneQuality = 'high'
): PostComposerBundle {
  const multisampling = quality === 'high' ? 8 : quality === 'medium' ? 2 : 0
  const composer = new EffectComposer(renderer, { multisampling })
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    intensity: SHOWROOM_LIGHTING.bloomIntensity,
    luminanceThreshold: 0,
    luminanceSmoothing: 1.6,
    mipmapBlur: true
  })
  composer.addPass(new EffectPass(camera, bloom))
  return { composer, bloom }
}

export function setBloomSmoothing(bloom: BloomEffect, value: number): void {
  bloom.luminanceMaterial.smoothing = value
}
