/** 应用 Logo（assets/logo/icon-*.png） */
import logo16 from '@assets/logo/icon-16.png'
import logo32 from '@assets/logo/icon-32.png'
import logo64 from '@assets/logo/icon-64.png'
import logo128 from '@assets/logo/icon-128.png'
import logo256 from '@assets/logo/icon-256.png'

export const APP_LOGO = {
  16: logo16,
  32: logo32,
  64: logo64,
  128: logo128,
  256: logo256
} as const

/** 侧栏品牌区（2rem ≈ 32px） */
export const APP_LOGO_NAV = APP_LOGO[32]

/** 页面 favicon */
export const APP_LOGO_FAVICON = APP_LOGO[32]
