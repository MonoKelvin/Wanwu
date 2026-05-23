/** 应用 Logo（assets/logo/icon-*.png，无 SVG） */
import { resolveColorScheme } from '@app/theme/applyTheme'
import type { ColorScheme, ResolvedColorScheme } from '@shared/types/settings'

import logo16 from '@assets/logo/icon-16.png'
import logo32 from '@assets/logo/icon-32.png'
import logo64 from '@assets/logo/icon-64.png'
import logo128 from '@assets/logo/icon-128.png'
import logo256 from '@assets/logo/icon-256.png'

import logo16Dark from '@assets/logo/icon-16-dark.png'
import logo32Dark from '@assets/logo/icon-32-dark.png'
import logo64Dark from '@assets/logo/icon-64-dark.png'
import logo128Dark from '@assets/logo/icon-128-dark.png'
import logo256Dark from '@assets/logo/icon-256-dark.png'

export type AppLogoSize = 16 | 32 | 64 | 128 | 256

export const APP_LOGO_LIGHT = {
  16: logo16,
  32: logo32,
  64: logo64,
  128: logo128,
  256: logo256
} as const satisfies Record<AppLogoSize, string>

export const APP_LOGO_DARK = {
  16: logo16Dark,
  32: logo32Dark,
  64: logo64Dark,
  128: logo128Dark,
  256: logo256Dark
} as const satisfies Record<AppLogoSize, string>

export function resolveAppLogo(scheme: ColorScheme | ResolvedColorScheme): typeof APP_LOGO_LIGHT {
  const resolved: ResolvedColorScheme =
    scheme === 'system' ? resolveColorScheme('system') : scheme === 'dark' ? 'dark' : 'light'
  return resolved === 'dark' ? APP_LOGO_DARK : APP_LOGO_LIGHT
}

export function appLogoFor(scheme: ColorScheme | ResolvedColorScheme, size: AppLogoSize): string {
  return resolveAppLogo(scheme)[size]
}
