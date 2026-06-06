import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import extract from 'extract-zip'
import { MANIFEST_ENTRY_PATH, normalizeEntryPath } from '@shared/documentPackage'
import { ZipArchive } from '../zipArchive'
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

async function extractZipToDir(zipPath: string, dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true })
  await extract(zipPath, { dir })
}

export async function openPackageFromZip(
  zipPath: string,
  options?: { password?: string }
): Promise<WanwuDocumentPackage> {
  const staging = join(tmpdir(), `wanwu-pkg-${randomUUID()}`)
  try {
    await extractZipToDir(zipPath, staging)
    return openPackageFromExtractedDir(staging, options)
  } finally {
    try {
      rmSync(staging, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

async function openPackageFromExtractedDir(
  dir: string,
  options?: { password?: string }
): Promise<WanwuDocumentPackage> {
  const manifestPath = join(dir, MANIFEST_ENTRY_PATH)
  if (!existsSync(manifestPath)) {
    throw new Error(`压缩包缺少 ${MANIFEST_ENTRY_PATH}`)
  }
  const manifestRaw = readFileSync(manifestPath)
  const pkg = WanwuDocumentPackage.fromManifest(
    JSON.parse(manifestRaw.toString('utf-8')),
    { password: options?.password }
  )
  pkg.ingestRawEntry(MANIFEST_ENTRY_PATH, manifestRaw)
  for (const rel of listFilesRecursive(dir)) {
    if (rel === MANIFEST_ENTRY_PATH) continue
    pkg.ingestRawEntry(rel, readFileSync(join(dir, rel)))
  }
  pkg.markAllClean()
  return pkg
}

export async function savePackageToZip(
  zipPath: string,
  pkg: WanwuDocumentPackage,
  options?: { password?: string }
): Promise<void> {
  const materialized = pkg.materializeEntriesForWrite({ password: options?.password })
  mkdirSync(dirname(zipPath), { recursive: true })

  await new Promise<void>((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 6 } })
    const stream = createWriteStream(zipPath)
    stream.on('close', () => resolve())
    stream.on('error', reject)
    archive.on('error', reject)
    archive.pipe(stream)

    const paths = [...materialized.keys()].sort()
    for (const path of paths) {
      const data = materialized.get(path)!
      archive.append(data, { name: path })
    }

    void archive.finalize().catch(reject)
  })
  pkg.markAllClean()
}
