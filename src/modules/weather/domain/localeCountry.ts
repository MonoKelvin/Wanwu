/**
 * 系统 locale 国家码：主进程通过 configureLocaleCountryResolver 注入 Electron 读取；
 * 渲染进程回退到 navigator.language。
 */
let localeCountryResolver: (() => string) | null = null

/** 主进程启动时注入 Electron 的 locale 读取（渲染进程勿调用） */
export function configureLocaleCountryResolver(resolver: () => string): void {
  localeCountryResolver = resolver
}

export function getLocaleCountryCode(): string {
  if (localeCountryResolver) return localeCountryResolver()
  if (typeof navigator !== 'undefined' && navigator.language) {
    const parts = navigator.language.split(/[-_]/)
    if (parts.length >= 2) return parts[parts.length - 1].toUpperCase()
    return parts[0]?.toUpperCase() ?? 'CN'
  }
  return 'CN'
}

/** IP 国家与系统 locale 不一致时，多为 VPN/代理出口，不宜用于定位 */
export function isLikelyProxyIp(ipCountry: string | undefined, localeCountry: string): boolean {
  if (!ipCountry?.trim()) return false
  return ipCountry.trim().toUpperCase() !== localeCountry.trim().toUpperCase()
}
