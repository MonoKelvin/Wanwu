import type { WwIconName } from '@shared/icons/registry'

export interface LibraryMajorDescriptor {
  readonly id: string
  readonly name: string
  readonly icon: WwIconName
  readonly description?: string
  readonly order?: number
}

export type LibraryMajorId = string

export function isLibraryMajorId(value: string): value is LibraryMajorId {
  return typeof value === 'string' && value.length > 0
}

export function libraryMajorById(id: string, majors: LibraryMajorDescriptor[]): LibraryMajorDescriptor | undefined {
  return majors.find((m) => m.id === id)
}
