/**
 * 确保 better-sqlite3 与当前 Electron 的 Node ABI 一致（npm run dev 前调用）。
 * seed:library:reimport 会先为系统 Node 重编，结束时 postinstall 会切回 Electron。
 */
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const electronPath = require('electron')
const postinstall = join(root, 'scripts', 'postinstall.mjs')

function sqliteLoadsInElectron() {
  try {
    execFileSync(
      electronPath,
      ['-e', "const Database=require('better-sqlite3');const d=new Database(':memory:');d.close();"],
      {
        cwd: root,
        stdio: 'pipe',
        timeout: 30_000,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
      }
    )
    return true
  } catch {
    return false
  }
}

if (!sqliteLoadsInElectron()) {
  console.log('[万物] 正在为 Electron 重编 better-sqlite3…')
  execFileSync(process.execPath, [postinstall, '--force'], { cwd: root, stdio: 'inherit' })
  if (!sqliteLoadsInElectron()) {
    console.error('[万物] better-sqlite3 仍无法被 Electron 加载，请执行: npm run rebuild')
    process.exit(1)
  }
}
