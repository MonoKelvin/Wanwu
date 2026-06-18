import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publishTempFile } from '@shared/lib/fsEnsure'

export function createTempWfgPath(): string {
  return join(tmpdir(), `wanwu-${randomUUID()}.wfg.tmp`)
}

export async function publishTempWfgFile(tempPath: string, destPath: string): Promise<void> {
  await publishTempFile(tempPath, destPath)
}
