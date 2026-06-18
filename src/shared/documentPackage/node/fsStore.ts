import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { MANIFEST_ENTRY_PATH } from '../constants'
import { normalizeEntryPath } from '../manifest'
import type { IWanwuDocumentPackage } from '../IWanwuDocumentPackage'
import { WanwuDocumentPackage } from './WanwuDocumentPackage'

function listFilesRecursive(dir: string, base = ''): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = base ? `${base}/${name}` : name
    if (statSync(full).isDirectory()) {
      out.push(...listFilesRecursive(full, rel))
    } else {
      out.push(normalizeEntryPath(rel))
    }
  }
  return out
}

export function openPackageFromFolder(
  dir: string,
  options?: { password?: string }
): IWanwuDocumentPackage {
  const manifestPath = join(dir, MANIFEST_ENTRY_PATH)
  if (!existsSync(manifestPath)) {
    throw new Error(`目录缺少 ${MANIFEST_ENTRY_PATH}`)
  }

  const manifestRaw = readFileSync(manifestPath)
  const pkg = WanwuDocumentPackage.fromManifest(
    JSON.parse(manifestRaw.toString('utf-8')),
    { password: options?.password }
  )
  pkg.ingestRawEntry(MANIFEST_ENTRY_PATH, manifestRaw)

  for (const rel of listFilesRecursive(dir)) {
    if (rel === MANIFEST_ENTRY_PATH) continue
    const full = join(dir, rel)
    pkg.ingestRawEntry(rel, readFileSync(full))
  }
  pkg.markAllClean()
  return pkg
}

export function saveDirtyEntriesToFolder(
  dir: string,
  pkg: IWanwuDocumentPackage,
  options?: { password?: string }
): void {
  if (!pkg.isDirty()) return

  const materialized = pkg.materializeEntriesForWrite({ password: options?.password })

  for (const path of pkg.getRemovedPaths()) {
    const full = join(dir, path)
    if (existsSync(full)) rmSync(full, { force: true })
    pkg.markClean(path)
  }

  const dirty = new Set(pkg.getDirtyPaths())
  dirty.add(MANIFEST_ENTRY_PATH)

  for (const path of dirty) {
    const data = materialized.get(path)
    if (!data) continue
    const full = join(dir, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, data)
    pkg.markClean(path)
  }
}

export function saveAllEntriesToFolder(
  dir: string,
  pkg: IWanwuDocumentPackage,
  options?: { password?: string }
): void {
  const materialized = pkg.materializeEntriesForWrite({ password: options?.password })
  for (const [path, data] of materialized) {
    const full = join(dir, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, data)
  }
  pkg.markAllClean()
}
