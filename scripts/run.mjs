#!/usr/bin/env node
/**
 * 构建与开发辅助（统一入口）
 *
 *   node scripts/run.mjs check
 *   node scripts/run.mjs dev              # dev 前：check + sqlite electron + renderer
 *   node scripts/run.mjs sqlite electron  # 确保 better-sqlite3 匹配 Electron
 *   node scripts/run.mjs sqlite host        # 为系统 Node 重编（build 数据包前）
 *   node scripts/run.mjs sqlite rebuild [--force]
 *   node scripts/run.mjs renderer           # 开发态 renderer 回退包
 *   node scripts/run.mjs pack [opts]        # Windows 安装包（转发 pack/windows/pack.mjs）
 */
import { execFileSync, execSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const self = join(root, 'scripts', 'run.mjs')

function usage() {
  console.error(`
用法: node scripts/run.mjs <command>

  check                 校验 Node 版本
  dev                   开发前准备（check + sqlite electron + renderer）
  sqlite electron       确保 better-sqlite3 可被 Electron 加载
  sqlite host           为当前系统 Node 重编 better-sqlite3
  sqlite rebuild        仅为 Electron 重编 better-sqlite3（可加 --force）
  renderer              若无 out/renderer 则先构建一次
  pack [opts]           Windows 安装包（--iscc= --skip-build --skip-library-pack）
`)
  process.exit(1)
}

function cmdCheck() {
  const [major, minor] = process.versions.node.split('.').map(Number)
  const ok = major > 20 || (major === 20 && minor >= 19) || major >= 22
  if (!ok) {
    console.error('')
    console.error('[万物] 当前 Node 版本:', process.versions.node)
    console.error('[万物] Vite 7 / electron-vite 5 需要 Node >= 20.19 或 >= 22.12')
    console.error('[万物] 请升级 Node：https://nodejs.org/  或使用 nvm：`nvm install 22 && nvm use`')
    console.error('')
    process.exit(1)
  }
}

function sqliteLoadsInProcess(execPath, extraEnv = {}) {
  try {
    execFileSync(
      execPath,
      ['-e', "const Database=require('better-sqlite3');const d=new Database(':memory:');d.close();"],
      {
        cwd: root,
        stdio: 'pipe',
        timeout: 30_000,
        env: { ...process.env, ...extraEnv }
      }
    )
    return true
  } catch {
    return false
  }
}

function sqliteLoadsHost() {
  try {
    const Database = require('better-sqlite3')
    const db = new Database(':memory:')
    db.close()
    return true
  } catch {
    return false
  }
}

function cmdSqliteElectron() {
  const electronPath = require('electron')
  const env = { ELECTRON_RUN_AS_NODE: '1' }
  if (sqliteLoadsInProcess(electronPath, env)) return

  console.log('[万物] 正在为 Electron 重编 better-sqlite3…')
  execFileSync(process.execPath, [self, 'sqlite', 'rebuild', '--force'], {
    cwd: root,
    stdio: 'inherit'
  })
  if (!sqliteLoadsInProcess(electronPath, env)) {
    console.error('[万物] better-sqlite3 仍无法被 Electron 加载，请执行: npm run rebuild')
    process.exit(1)
  }
}

function cmdSqliteHost() {
  if (sqliteLoadsHost()) {
    console.log(`[万物] better-sqlite3 已匹配 Node ${process.versions.node}`)
    return
  }
  console.log(`[万物] 正在为 Node ${process.versions.node} 重编 better-sqlite3…`)
  execSync('npm rebuild better-sqlite3', { cwd: root, stdio: 'inherit', shell: true })
  if (!sqliteLoadsHost()) {
    console.error('[万物] better-sqlite3 重编后仍无法加载，请检查是否已安装 Visual Studio C++ 构建工具')
    process.exit(1)
  }
  console.log(`[万物] better-sqlite3 已匹配 Node ${process.versions.node}`)
}

function cmdSqliteRebuild() {
  const force = process.argv.includes('--force') || process.env.WANWU_FORCE_REBUILD === '1'
  const electronRebuildBin = join(
    dirname(require.resolve('@electron/rebuild/package.json')),
    'lib',
    'cli.js'
  )
  const args = ['-o', 'better-sqlite3']
  if (force) args.unshift('-f')
  execFileSync(process.execPath, [electronRebuildBin, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  })
}

function cmdRenderer() {
  const html = join(root, 'out', 'renderer', 'index.html')
  if (existsSync(html)) return
  console.log('[万物] 未找到 out/renderer，正在构建 renderer 备用包…')
  const r = spawnSync('npx', ['electron-vite', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: true
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function cmdPack() {
  const packScript = join(root, 'pack', 'windows', 'pack.mjs')
  const extra = process.argv.slice(3)
  execFileSync(process.execPath, [packScript, ...extra], { cwd: root, stdio: 'inherit' })
}

function cmdDev() {
  cmdCheck()
  cmdSqliteElectron()
  cmdRenderer()
}

const [command, sub] = process.argv.slice(2)

if (command === 'check') cmdCheck()
else if (command === 'dev') cmdDev()
else if (command === 'sqlite' && sub === 'electron') cmdSqliteElectron()
else if (command === 'sqlite' && sub === 'host') cmdSqliteHost()
else if (command === 'sqlite' && sub === 'rebuild') cmdSqliteRebuild()
else if (command === 'renderer') cmdRenderer()
else if (command === 'pack') cmdPack()
else usage()
