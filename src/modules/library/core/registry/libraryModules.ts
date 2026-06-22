import { collectLibrarySubmodules } from '@app/modules/moduleRegistryCore'
import type { LibrarySubmoduleConfig } from '@app/modules/librarySubmoduleTypes'
import type { LibraryMajorId } from '@modules/library/core/config/majors'

export type { LibrarySubmoduleConfig } from '@app/modules/librarySubmoduleTypes'

let librarySubmodulesCache: LibrarySubmoduleConfig[] | null = null

function getLibrarySubmodules(): LibrarySubmoduleConfig[] {
  if (!librarySubmodulesCache) {
    librarySubmodulesCache = sortSubmodulesByMajorOrder(collectLibrarySubmodules())
  }
  return librarySubmodulesCache
}

function sortSubmodulesByMajorOrder(configs: LibrarySubmoduleConfig[]): LibrarySubmoduleConfig[] {
  return [...configs].sort((a, b) => (a.major.order ?? 0) - (b.major.order ?? 0))
}

export function librarySubmoduleById(id: LibraryMajorId): LibrarySubmoduleConfig | undefined {
  return getLibrarySubmodules().find((m) => m.id === id)
}

export function librarySubmodulesWithCatalog(): LibrarySubmoduleConfig[] {
  return getLibrarySubmodules().filter((m) => m.catalog)
}

export function libraryMajorIds(): LibraryMajorId[] {
  return getLibrarySubmodules().map((m) => m.id)
}

/** 模块注册变更后刷新缓存（测试/热插拔预留） */
export function invalidateLibrarySubmodulesCache(): void {
  librarySubmodulesCache = null
}
