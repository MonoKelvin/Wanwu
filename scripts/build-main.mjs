#!/usr/bin/env node
/** 仅构建 Electron main + preload（跳过 renderer） */
import './ensure-quiet-dotenv.mjs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(
  process.execPath,
  [join(root, 'scripts', 'electron-vite.mjs'), 'build'],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, WANWU_SKIP_RENDERER: '1' }
  }
)
process.exit(result.status ?? 1)
