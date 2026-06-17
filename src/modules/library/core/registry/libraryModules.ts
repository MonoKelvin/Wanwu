import { LIBRARY_MAJORS, type LibraryMajorId } from '@modules/library/core/config/majors'
import { collectLibrarySubmodules } from '@app/modules/moduleRegistryCore'
import type {
  LibrarySubmoduleConfig,
  LibrarySubmoduleContext
} from '@app/modules/librarySubmoduleTypes'

export type { LibrarySubmoduleConfig, LibrarySubmoduleContext } from '@app/modules/librarySubmoduleTypes'

let librarySubmodulesCache: LibrarySubmoduleConfig[] | null = null

function getLibrarySubmodules(): LibrarySubmoduleConfig[] {
  if (!librarySubmodulesCache) {
    librarySubmodulesCache = sortSubmodulesByMajorOrder(collectLibrarySubmodules())
  }
  return librarySubmodulesCache
}

function sortSubmodulesByMajorOrder(configs: LibrarySubmoduleConfig[]): LibrarySubmoduleConfig[] {
  const byId = new Map(
    configs.map((config) => [config.id as LibraryMajorId, config])
  )
  return LIBRARY_MAJORS.map((major) => byId.get(major.id)).filter(
    (config): config is LibrarySubmoduleConfig => Boolean(config)
  )
}

export function librarySubmoduleById(id: LibraryMajorId): LibrarySubmoduleConfig | undefined {
  return getLibrarySubmodules().find((m) => m.id === id)
}

export function libraryMajorIds(): LibraryMajorId[] {
  return LIBRARY_MAJORS.map((m) => m.id)
}
