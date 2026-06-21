/** 模块向框架注册的诊断与缓存清理贡献点 */
import type { AppSettings } from '../../src/shared/types/settings'
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'

export interface MaintenanceDiagnosticsContext {
  wanwuPath: string
  layout: WanwuPathLayout
  settings: AppSettings
}

export interface MaintenanceDiagnosticsContributor {
  readonly id: string
  order?: number
  appendLines(
    ctx: MaintenanceDiagnosticsContext
  ): string[] | Promise<string[]>
}

export interface MaintenanceCacheContributor {
  readonly id: string
  order?: number
  getCacheDirectories(layout: WanwuPathLayout): string[]
}

const diagnosticsContributors: MaintenanceDiagnosticsContributor[] = []
const cacheContributors: MaintenanceCacheContributor[] = []

function sortByOrder<T extends { order?: number }>(items: T[]): void {
  items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function registerMaintenanceDiagnosticsContributor(
  contributor: MaintenanceDiagnosticsContributor
): void {
  diagnosticsContributors.push(contributor)
  sortByOrder(diagnosticsContributors)
}

export function registerMaintenanceCacheContributor(
  contributor: MaintenanceCacheContributor
): void {
  cacheContributors.push(contributor)
  sortByOrder(cacheContributors)
}

export function clearMaintenanceContributors(): void {
  diagnosticsContributors.length = 0
  cacheContributors.length = 0
}

export async function collectDiagnosticsLines(
  ctx: MaintenanceDiagnosticsContext
): Promise<string[]> {
  const lines: string[] = []
  for (const contributor of diagnosticsContributors) {
    const chunk = await contributor.appendLines(ctx)
    if (chunk.length) lines.push(...chunk)
  }
  return lines
}

export function collectCacheDirectories(layout: WanwuPathLayout): string[] {
  const dirs = new Set<string>([layout.cache])
  for (const contributor of cacheContributors) {
    for (const dir of contributor.getCacheDirectories(layout)) {
      if (dir) dirs.add(dir)
    }
  }
  return [...dirs]
}
