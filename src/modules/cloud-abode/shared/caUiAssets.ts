import patternGrain from '@assets/seed/cloud-abode/ui/pattern-grain.png'
import patternDots from '@assets/seed/cloud-abode/ui/pattern-dots.png'
import decorArcSoft from '@assets/seed/cloud-abode/ui/decor-arc-soft.png'
import decorFrameCorner from '@assets/seed/cloud-abode/ui/decor-frame-corner.png'

/** 云斋 UI 装饰 PNG（Vite 打包 URL，避免 wanwu-media 未解析 seed 导致 404） */
export const CA_UI_ASSETS = {
  grain: patternGrain,
  dots: patternDots,
  arcSoft: decorArcSoft,
  frameCorner: decorFrameCorner
} as const
