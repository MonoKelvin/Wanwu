/**
 * 仅为 Electron 重编 better-sqlite3。
 * 不使用 -f，避免强制重编 electron-native-share（需 VS C++，且 VS2026 暂未被 node-gyp 识别）。
 * electron-native-share 依赖其 install 脚本中的 node-gyp-build 预编译产物。
 */
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const electronRebuildBin = join(
  dirname(require.resolve('@electron/rebuild/package.json')),
  'lib',
  'cli.js'
)

const force = process.argv.includes('--force') || process.env.WANWU_FORCE_REBUILD === '1'
// -o：仅重编指定模块；-w 仍会扫描并尝试重编其他原生依赖（如 electron-native-share）
const args = ['-o', 'better-sqlite3']
if (force) {
  args.unshift('-f')
}

execFileSync(process.execPath, [electronRebuildBin, ...args], {
  cwd: root,
  stdio: 'inherit',
  env: process.env
})
