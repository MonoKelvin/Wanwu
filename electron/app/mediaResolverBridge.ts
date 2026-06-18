/** 可选模块向框架注册的媒体路径解析（删除模块后 wanwu-media 回退为 null） */
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'

export interface MediaResolverHooks {
  resolveHandbookMediaAbsolute?: (relativePath: string) => string | null
  resolveDiagramMediaAbsoluteAsync?: (
    relativePath: string,
    layout: WanwuPathLayout
  ) => Promise<string | null>
}

let hooks: MediaResolverHooks = {}

export function registerMediaResolverHooks(next: MediaResolverHooks): void {
  hooks = { ...hooks, ...next }
}

export function clearMediaResolverHooks(): void {
  hooks = {}
}

export function resolveHandbookMediaAbsolute(relativePath: string): string | null {
  return hooks.resolveHandbookMediaAbsolute?.(relativePath) ?? null
}

export async function resolveDiagramMediaAbsoluteAsync(
  relativePath: string,
  layout: WanwuPathLayout
): Promise<string | null> {
  return (await hooks.resolveDiagramMediaAbsoluteAsync?.(relativePath, layout)) ?? null
}
