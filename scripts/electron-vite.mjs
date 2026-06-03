#!/usr/bin/env node
import './ensure-quiet-dotenv.mjs'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bin = join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')

if (!existsSync(bin)) {
  console.error('[万物] 未找到 electron-vite，请先执行 npm install')
  process.exit(1)
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('用法: node scripts/electron-vite.mjs <dev|build|preview|...>')
  process.exit(1)
}

const result = spawnSync(process.execPath, [bin, ...args], {
  cwd: root,
  stdio: 'inherit',
  env: process.env
})

process.exit(result.status ?? 1)
