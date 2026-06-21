/**
 * 业务模块注册表核心（组合根的一部分）。
 *
 * 各模块在 modules/…/app/register.ts 中调用 {@link registerAppModule} 完成自注册；
 * 本文件负责将模块挂接到导航、路由、Shell、设置等全局注册表。
 *
 * 注意：须与 {@link moduleRegistryBootstrap} 分离——Vite 会把 eager glob 提升到文件顶部，
 * 若 glob 与 `appModules` 同文件会导致「Cannot access 'appModules' before initialization」白屏。
 */
import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'
import type { ICommandContributor } from '@app/command'
import type { LibrarySubmoduleConfig } from '@app/modules/librarySubmoduleTypes'
import { registerBootModeContributor } from '@app/modules/bootModeRegistry'
import { registerMainAppIntegration, registerMainAppStartup } from '@app/modules/mainAppRegistry'
import { registerNavigationContributor } from '@app/modules/navigationRegistry'
import { registerModuleNav } from '@app/modules/moduleNavRegistry'
import { registerPathMemoryContributor } from '@app/modules/pathMemoryRegistry'
import { registerQuickAccessKind, registerQuickAccessTargetHandler } from '@shared/module-bridge/quickAccessRendererBridge'
import { registerSettingsSection } from '@app/modules/settingsSectionRegistry'
import { registerLibrarySettingsGroup } from '@app/modules/librarySettingsGroupRegistry'
import { registerAppSettingsGroup } from '@app/modules/appSettingsGroupRegistry'
import { registerSidebarFooterContributor } from '@app/modules/sidebarFooterRegistry'
import { registerShellChromeContributor } from '@app/modules/shellChromeRegistry'
import { registerShellOutletContributor } from '@app/modules/shellOutletRegistry'
import { registerShellThemeContributor } from '@app/modules/shellThemeRegistry'
import { registerSubPanelContributor } from '@app/modules/subPanelRegistry'
import type { IAppModule } from '@app/modules/types'
import type { ModuleId } from '@shared/constants/modules'

const appModules: IAppModule[] = []

/** 注册业务模块；各模块在 modules/…/app/register.ts 中调用 */
export function registerAppModule(module: IAppModule): void {
  if (appModules.some((item) => item.id === module.id)) return
  appModules.push(module)
  wireModule(module)
}

/** 将已注册模块的扩展点写入各全局注册表（导航、Shell、快捷访问等） */
function wireModule(module: IAppModule): void {
  const nav = module.getModuleNav?.()
  if (nav) {
    registerModuleNav({
      ...nav,
      isEnabled: () => module.isModuleEnabled?.() ?? true
    })
  }
  module.registerNavigation?.(registerNavigationContributor)
  module.registerShellOutlet?.(registerShellOutletContributor)
  module.registerBootMode?.(registerBootModeContributor)
  module.registerMainAppIntegration?.(registerMainAppIntegration)
  module.registerMainAppStartup?.(registerMainAppStartup)
  module.registerQuickAccess?.((handler) => {
    if (handler.paletteMeta) {
      registerQuickAccessKind({
        kind: handler.kind,
        label: handler.paletteMeta.label,
        icon: handler.paletteMeta.icon,
        order: handler.paletteMeta.order
      })
    }
    registerQuickAccessTargetHandler(handler)
  })
  module.registerSettingsSection?.(registerSettingsSection)
  module.registerLibrarySettingsGroup?.(registerLibrarySettingsGroup)
  module.registerAppSettingsGroup?.(registerAppSettingsGroup)
  module.registerSidebarFooter?.(registerSidebarFooterContributor)
  module.registerSubPanel?.(registerSubPanelContributor)
  module.registerShellChrome?.(registerShellChromeContributor)
  module.registerShellTheme?.(registerShellThemeContributor)
  module.registerPathMemory?.(registerPathMemoryContributor)
}

/** 返回所有已注册业务模块（只读快照） */
export function getAppModules(): readonly IAppModule[] {
  return appModules
}

/** 聚合各模块顶层路由，供 `router/index.ts` 使用 */
export function collectModuleRoutes(): RouteRecordRaw[] {
  return appModules.flatMap((module) => module.getRoutes?.() ?? [])
}

/** 聚合挂载在 `/library` 下的子模块路由 */
export function collectLibraryChildRoutes(): RouteRecordRaw[] {
  return appModules.flatMap((module) => module.getLibraryChildRoutes?.() ?? [])
}

/** 聚合各模块声明的全库子模块配置（链接、笔记、图鉴等） */
export function collectLibrarySubmodules(): LibrarySubmoduleConfig[] {
  return appModules
    .map((module) => module.getLibrarySubmodule?.())
    .filter((config): config is LibrarySubmoduleConfig => Boolean(config))
}

/**
 * @param cat 旧版 URL 段 `/library/:legacyCat/...` 中的大类 id
 * @param sub 可选子路径段
 * @returns 模块自定义的重定向目标，无则 null
 */
export function resolveModuleLegacyLibraryPath(
  cat: string,
  sub?: string
): RouteLocationRaw | null {
  for (const module of appModules) {
    const resolved = module.resolveLegacyLibraryPath?.(cat, sub)
    if (resolved) return resolved
  }
  return null
}

/** 当模块未识别 legacy 路径时的兜底重定向 */
export function resolveFallbackLegacyLibraryPath(
  cat: string,
  sub?: string
): RouteLocationRaw | null {
  for (const module of appModules) {
    const resolved = module.resolveFallbackLegacyLibraryPath?.(cat, sub)
    if (resolved) return resolved
  }
  return null
}

/** 进入 `/library` 时默认跳转的子路由 name（如 `library-links`） */
export function getLibraryHomeRouteName(): string | undefined {
  return appModules.find((module) => module.libraryHomeRouteName)?.libraryHomeRouteName
}

/** 聚合各模块注册的命令面板贡献项 */
export function collectCommandContributors(): ICommandContributor[] {
  return appModules
    .map((module) => module.commandContributor)
    .filter((contributor): contributor is ICommandContributor => Boolean(contributor))
}

function normalizeAppPath(path: string): string {
  return path.replace(/^#/, '').split('?')[0] ?? ''
}

/** 判断路径是否属于全库模块（用于路径记忆、侧栏显隐等） */
export function belongsToLibraryModulePath(path: string): boolean {
  const normalized = normalizeAppPath(path)
  if (normalized.startsWith('/library')) return true
  for (const module of appModules) {
    if (module.belongsToLibraryPath?.(normalized)) return true
  }
  return false
}

/** 按 moduleId 懒加载模块 Shell 根视图 */
export function loadShellView(moduleId: ModuleId): (() => Promise<Component>) | undefined {
  const module = appModules.find((item) => item.moduleId === moduleId)
  if (!module?.loadShellView) return undefined
  return () => module.loadShellView!()
}

/** 懒加载物品详情页（item 模块可选提供） */
export function loadItemDetailView(): (() => Promise<Component>) | undefined {
  const module = appModules.find((item) => item.loadItemDetailView)
  if (!module?.loadItemDetailView) return undefined
  return () => module.loadItemDetailView!()
}
