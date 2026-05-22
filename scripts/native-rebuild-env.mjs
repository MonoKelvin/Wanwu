/**
 * Windows 上 node-gyp / @electron/rebuild 的 MSVC 与 Electron 下载环境。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const NODE_GYP_FIND_VS = join(
  ROOT,
  'node_modules/@electron/node-gyp/lib/find-visualstudio.js'
)

const VS2026_PATCH_MARKER = 'wanwu: VS2026 (major 18) → versionYear 2022'

/** Visual Studio 2026（major 18）未被 @electron/node-gyp 识别时，打最小补丁 */
export function ensureNodeGypVs2026Patch() {
  if (process.platform !== 'win32' || !existsSync(NODE_GYP_FIND_VS)) return false
  const src = readFileSync(NODE_GYP_FIND_VS, 'utf8')
  if (src.includes(VS2026_PATCH_MARKER)) return true
  const anchor = `    if (ret.versionMajor === 17) {
      ret.versionYear = 2022
      return ret
    }`
  if (!src.includes(anchor)) {
    console.warn('[万物] 无法为 node-gyp 打 VS2026 补丁：find-visualstudio.js 结构已变化')
    return false
  }
  const insert = `${anchor}
    // ${VS2026_PATCH_MARKER}
    if (ret.versionMajor === 18) {
      ret.versionYear = 2022
      return ret
    }`
  writeFileSync(NODE_GYP_FIND_VS, src.replace(anchor, insert), 'utf8')
  console.log('[万物] 已为 @electron/node-gyp 启用 Visual Studio 2026 兼容补丁')
  return true
}

function vs2022InstallExists() {
  const candidates = [
    'D:\\Visual Studio\\VS2022',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise'
  ]
  return candidates.some((p) => existsSync(p))
}

/** @param {NodeJS.ProcessEnv} [base] */
export function applyWin32MsvsEnv(base = process.env) {
  const env = { ...base }
  if (process.platform !== 'win32') return env
  ensureNodeGypVs2026Patch()
  if (vs2022InstallExists()) {
    const msvs = env.GYP_MSVS_VERSION || env.npm_config_msvs_version || '2022'
    env.GYP_MSVS_VERSION = msvs
    env.npm_config_msvs_version = msvs
  } else {
    delete env.GYP_MSVS_VERSION
    delete env.npm_config_msvs_version
  }
  return env
}

/** electron-builder 下载 Electron / 二进制时的国内镜像（可被环境变量覆盖） */
export function applyElectronDownloadEnv(base = process.env) {
  return {
    ...base,
    ELECTRON_MIRROR: base.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/',
    ELECTRON_BUILDER_BINARIES_MIRROR:
      base.ELECTRON_BUILDER_BINARIES_MIRROR ||
      'https://npmmirror.com/mirrors/electron-builder-binaries/'
  }
}

/** pack / rebuild 子进程推荐环境 */
export function packBuildEnv(base = process.env) {
  return applyElectronDownloadEnv(applyWin32MsvsEnv(base))
}
