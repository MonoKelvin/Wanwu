import { collectLibrarySubmodules } from '@app/modules/moduleRegistryCore'
import type { LibraryMajorDescriptor, LibraryMajorId } from '@app/modules/libraryMajorTypes'
import { libraryMajorById as findMajorById } from '@app/modules/libraryMajorTypes'

export type { LibraryMajorDescriptor, LibraryMajorId } from '@app/modules/libraryMajorTypes'
export { isLibraryMajorId } from '@app/modules/libraryMajorTypes'

/** 全库顶级大分类（由各文库子模块注册，运行时聚合） */
export function collectLibraryMajors(): LibraryMajorDescriptor[] {
  return collectLibrarySubmodules()
    .map((config) => config.major)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/** @deprecated 使用 collectLibraryMajors()；保留兼容旧引用 */
export function getLibraryMajorsSnapshot(): LibraryMajorDescriptor[] {
  return collectLibraryMajors()
}

export function libraryMajorById(id: string): LibraryMajorDescriptor | undefined {
  return findMajorById(id, collectLibraryMajors())
}

export function libraryMajorIds(): LibraryMajorId[] {
  return collectLibraryMajors().map((m) => m.id)
}
