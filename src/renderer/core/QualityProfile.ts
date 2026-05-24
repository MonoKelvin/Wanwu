import type { RenderQuality } from '../types/engine'
import { UnsignedByteType } from 'three'

export interface QualitySettings {
  pixelRatio: number
  multisampling: number
  postProcessing: boolean
  frameBufferType: typeof UnsignedByteType
}

/** 根据质量档位解析 DPR 与 MSAA 参数 */
export function resolveQualitySettings(quality: RenderQuality): QualitySettings {
  const base = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  switch (quality) {
    case 'high':
      return {
        pixelRatio: Math.min(base, 2),
        // MSAA 由后期栈自行处理；部分驱动上 MSAA>0 会导致 FBO 创建失败
        multisampling: 0,
        postProcessing: true,
        frameBufferType: UnsignedByteType
      }
    case 'medium':
      return {
        pixelRatio: Math.min(base, 1.5),
        multisampling: 0,
        postProcessing: true,
        frameBufferType: UnsignedByteType
      }
    case 'low':
      return {
        pixelRatio: 1,
        multisampling: 0,
        postProcessing: false,
        frameBufferType: UnsignedByteType
      }
  }
}

function wantsExtendedPost(options: {
  cinematic?: boolean
  enableSSR?: boolean
  enableSSAO?: boolean
  enableSMAA?: boolean
  enableCinematicGrade?: boolean
  enableTemporalAA?: boolean
  enableDoF?: boolean
}): boolean {
  return Boolean(
    options.cinematic ||
      options.enableSSR ||
      options.enableSSAO ||
      options.enableSMAA ||
      options.enableCinematicGrade ||
      options.enableTemporalAA ||
      options.enableDoF
  )
}

export { wantsExtendedPost }
