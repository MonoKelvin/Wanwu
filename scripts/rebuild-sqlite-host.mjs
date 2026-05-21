/**
 * 为当前系统 Node 重编 better-sqlite3（供 tsx / node 脚本使用）。
 * postinstall 仅面向 Electron，运行 seed:library:reimport 前需先执行本脚本。
 */
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const npmCli = join(dirname(process.execPath), process.platform === 'win32' ? 'npm.cmd' : 'npm')

function sqliteLoads() {
  try {
    const Database = require('better-sqlite3')
    const db = new Database(':memory:')
    db.close()
    return true
  } catch {
    return false
  }
}

if (!sqliteLoads()) {
  console.log(`[万物] 正在为 Node ${process.versions.node} 重编 better-sqlite3…`)
  execFileSync(npmCli, ['rebuild', 'better-sqlite3'], { cwd: root, stdio: 'inherit' })
  if (!sqliteLoads()) {
    console.error('[万物] better-sqlite3 重编后仍无法加载，请检查是否已安装 Visual Studio C++ 构建工具')
    process.exit(1)
  }
}
console.log(`[万物] better-sqlite3 已匹配 Node ${process.versions.node}`)
