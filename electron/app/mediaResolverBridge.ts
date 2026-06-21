/** 模块向框架注册的 wanwu-media 路径解析器（按 order 依次尝试） */
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'

export interface MediaPathResolver {
  readonly id: string
  order?: number
  /** 仅当相对路径以此前缀开头时尝试；省略则始终尝试 */
  prefix?: string
  /** toWanwuMediaUrl 在无本地文件时仍返回 URL（如 diagrams 缓存） */
  allowUrlWithoutFile?: boolean
  resolveSync?(relativePath: string, layout: WanwuPathLayout): string | null
  resolveAsync?(relativePath: string, layout: WanwuPathLayout): Promise<string | null>
}

const resolvers: MediaPathResolver[] = []

export function registerMediaPathResolver(resolver: MediaPathResolver): void {
  resolvers.push(resolver)
  resolvers.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function clearMediaPathResolvers(): void {
  resolvers.length = 0
}

function matchesPrefix(relativePath: string, prefix: string | undefined): boolean {
  if (!prefix) return true
  return relativePath.startsWith(prefix)
}

export function resolveMediaPathSync(
  relativePath: string,
  layout: WanwuPathLayout
): string | null {
  for (const resolver of resolvers) {
    if (!matchesPrefix(relativePath, resolver.prefix)) continue
    const hit = resolver.resolveSync?.(relativePath, layout)
    if (hit) return hit
  }
  return null
}

export async function resolveMediaPathAsync(
  relativePath: string,
  layout: WanwuPathLayout
): Promise<string | null> {
  const sync = resolveMediaPathSync(relativePath, layout)
  if (sync) return sync
  for (const resolver of resolvers) {
    if (!matchesPrefix(relativePath, resolver.prefix)) continue
    const hit = await resolver.resolveAsync?.(relativePath, layout)
    if (hit) return hit
  }
  return null
}

export function shouldAllowMediaUrlWithoutFile(relativePath: string): boolean {
  for (const resolver of resolvers) {
    if (!resolver.allowUrlWithoutFile) continue
    if (matchesPrefix(relativePath, resolver.prefix)) return true
  }
  return false
}
