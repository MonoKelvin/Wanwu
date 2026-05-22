#!/usr/bin/env node
/**
 * Windows 安装包：图鉴 zip 单独产出 → build → electron-builder → 设置 exe 图标 → Inno Setup
 *
 *   node pack/windows/pack.mjs
 *   node pack/windows/pack.mjs --skip-build
 *   node pack/windows/pack.mjs --skip-library-pack
 *   node pack/windows/pack.mjs --iscc="D:\Inno Setup 7\ISCC.exe"
 */
import { execFileSync, execSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rcedit } from 'rcedit'
import { packBuildEnv } from '../../scripts/native-rebuild-env.mjs'

const PACK_DIR = dirname(fileURLToPath(import.meta.url))
const PACK_ROOT = join(PACK_DIR, '..')
const ROOT = join(PACK_ROOT, '..')
const ISS_FILE = join(PACK_DIR, 'wanwu.iss')
const BUILDER_CONFIG = join(PACK_DIR, 'builder.json')
const RELEASE_DIR = join(ROOT, 'release')
const APP_ICO = join(PACK_ROOT, 'app.ico')
const LOGO_ICO_SCRIPT = join(ROOT, 'scripts', 'generate-app-ico.mjs')
const LOGO_PNG_SOURCE = join(ROOT, 'assets', 'logo', 'icon-256.png')
const LIBRARY_PACK_ZIP = join(ROOT, 'assets', 'packed', 'library-data-pack.zip')
const LIBRARY_PACK_NAME = 'library-data-pack.zip'
const CHINESE_ISL = join(PACK_DIR, 'ChineseSimplified.isl')
/** 禁止打入安装包的整包归档（会导致卸载不干净） */
const FORBIDDEN_STAGE_ARCHIVE = /^wanwu-payload-.*\.(zip|7z)$/i

const ISCC_NAME = 'ISCC.exe'

/** Inno Setup 卸载项注册表路径（含 6/7、HKLM/HKCU、WOW6432Node） */
const INNO_UNINSTALL_KEYS = [
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Inno Setup 7_is1',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Inno Setup 7_is1',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Inno Setup 6_is1',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Inno Setup 6_is1',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Inno Setup 7_is1',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Inno Setup 6_is1'
]

const ISCC_STATIC_CANDIDATES = [
  'D:\\Inno Setup 7\\ISCC.exe',
  'C:\\Program Files (x86)\\Inno Setup 7\\ISCC.exe',
  'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
  'C:\\Program Files\\Inno Setup 7\\ISCC.exe',
  'C:\\Program Files\\Inno Setup 6\\ISCC.exe'
]

function parseArgs(argv) {
  let iscc = process.env.INNO_SETUP_ISCC?.trim() || ''
  let skipBuild = false
  let skipLibraryPack = false
  for (const arg of argv) {
    if (arg === '--skip-build') skipBuild = true
    else if (arg === '--skip-library-pack') skipLibraryPack = true
    else if (arg.startsWith('--iscc=')) iscc = arg.slice(7).trim().replace(/^["']|["']$/g, '')
  }
  return { iscc, skipBuild, skipLibraryPack }
}

function fileExists(path) {
  try {
    return existsSync(path)
  } catch {
    return false
  }
}

function regQueryValue(keyPath, valueName) {
  if (process.platform !== 'win32') return null
  try {
    const out = execSync(`reg query "${keyPath}" /v "${valueName}"`, {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    const re = new RegExp(`REG_SZ\\s+(.+)$`, 'im')
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes(valueName)) continue
      const m = line.match(re)
      if (m?.[1]) return m[1].trim().replace(/^"|"$/g, '')
    }
  } catch {
    /* 键不存在 */
  }
  return null
}

/** 从卸载注册表读取 Inno Setup 安装目录 */
function findInnoDirFromRegistry() {
  for (const key of INNO_UNINSTALL_KEYS) {
    const appPath =
      regQueryValue(key, 'Inno Setup: App Path') ?? regQueryValue(key, 'InstallLocation')
    if (appPath) return appPath.replace(/[\\/]+$/, '')
  }
  return null
}

function isccFromDir(dir) {
  if (!dir) return null
  const p = join(dir.replace(/[\\/]+$/, ''), ISCC_NAME)
  return fileExists(p) ? p : null
}

/** 常见 Program Files 下的 Inno 目录 */
function isccFromProgramFiles() {
  const roots = [
    process.env['ProgramFiles(x86)'],
    process.env.ProgramFiles,
    process.env.ProgramW6432
  ].filter(Boolean)
  const names = ['Inno Setup 7', 'Inno Setup 6']
  for (const root of roots) {
    for (const name of names) {
      const hit = isccFromDir(join(root, name))
      if (hit) return hit
    }
  }
  return null
}

/** PATH 中的 ISCC（若安装时勾选了命令行工具） */
function isccFromPathEnv() {
  if (process.platform !== 'win32') return null
  try {
    const out = execSync('where ISCC', {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    const first = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && fileExists(l))
    return first ?? null
  } catch {
    return null
  }
}

/** 按优先级收集 ISCC.exe 候选路径（去重） */
function discoverIsccCandidates(explicit) {
  const seen = new Set()
  const add = (p) => {
    if (!p || seen.has(p)) return
    seen.add(p)
    list.push(p)
  }
  const list = []

  add(explicit?.trim().replace(/^["']|["']$/g, ''))
  add(process.env.INNO_SETUP_ISCC?.trim().replace(/^["']|["']$/g, ''))

  add(isccFromPathEnv())
  add(isccFromDir(findInnoDirFromRegistry()))
  add(isccFromProgramFiles())

  for (const p of ISCC_STATIC_CANDIDATES) add(p)

  return list.filter((p) => fileExists(p))
}

async function promptIsccPath() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise((resolve) => {
    console.log('')
    console.log('[pack] 未找到 Inno Setup 编译器 ISCC.exe')
    console.log('[pack] 请安装 Inno Setup 7：https://jrsoftware.org/isdl.php')
    rl.question('[pack] 请输入 ISCC.exe 完整路径: ', (line) => {
      rl.close()
      resolve(line.trim().replace(/^["']|["']$/g, ''))
    })
  })
  return answer
}

async function resolveIscc(explicit) {
  const found = discoverIsccCandidates(explicit)
  if (found.length > 0) {
    if (found.length > 1) {
      console.log(`[pack] 已自动定位 ISCC（${found.length} 处候选，使用首个）`)
    }
    return found[0]
  }

  const entered = await promptIsccPath()
  const manual = entered?.trim().replace(/^["']|["']$/g, '')
  if (manual && fileExists(manual)) return manual
  if (manual) {
    const fromDir = isccFromDir(manual)
    if (fromDir) return fromDir
  }

  console.error('[pack] 无效路径或未找到 ISCC.exe')
  console.error('[pack] 可设置环境变量 INNO_SETUP_ISCC 或参数 --iscc="完整路径"')
  process.exit(1)
}

function readAppVersion() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
  return String(pkg.version ?? '0.0.0')
}

function versionForInno(version) {
  const parts = version.split('.').map((n) => String(Number(n) || 0))
  while (parts.length < 4) parts.push('0')
  return parts.slice(0, 4).join('.')
}

function findWinUnpackedDir() {
  if (!fileExists(RELEASE_DIR)) return null
  const direct = join(RELEASE_DIR, 'win-unpacked')
  if (fileExists(direct)) return direct

  for (const ent of readdirSync(RELEASE_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue
    const nested = join(RELEASE_DIR, ent.name, 'win-unpacked')
    if (fileExists(nested)) return nested
  }
  return null
}

/** pack/app.ico：由 assets/logo/icon-256.png 生成，供 Inno 安装包 / electron-builder / rcedit */
function ensureAppIco() {
  if (!fileExists(LOGO_PNG_SOURCE)) {
    console.error(`[pack] 缺少软件图标源图: ${LOGO_PNG_SOURCE}`)
    process.exit(1)
  }
  const needRegen =
    !fileExists(APP_ICO) || statSync(LOGO_PNG_SOURCE).mtimeMs > statSync(APP_ICO).mtimeMs
  if (needRegen) {
    if (!fileExists(LOGO_ICO_SCRIPT)) {
      console.error(`[pack] 缺少 ${LOGO_ICO_SCRIPT}`)
      process.exit(1)
    }
    console.log('[pack] 从 assets/logo/icon-256.png 生成 pack/app.ico（安装包与 exe 共用）…')
    execFileSync(process.execPath, [LOGO_ICO_SCRIPT], { cwd: ROOT, stdio: 'inherit' })
  }
  if (!fileExists(APP_ICO)) {
    console.error('[pack] 未生成 pack/app.ico')
    process.exit(1)
  }
  const icoSize = statSync(APP_ICO).size
  if (icoSize < 1024) {
    console.error(`[pack] pack/app.ico 体积异常（${icoSize} B），请执行 npm run logo:ico`)
    process.exit(1)
  }
  return APP_ICO
}

function ensureChineseLangFile(iscc) {
  if (fileExists(CHINESE_ISL)) return CHINESE_ISL
  const innoRoot = dirname(dirname(iscc))
  const fromInno = join(innoRoot, 'Languages', 'ChineseSimplified.isl')
  if (fileExists(fromInno)) {
    copyFileSync(fromInno, CHINESE_ISL)
    return CHINESE_ISL
  }
  console.warn('[pack] 未找到中文语言文件，安装界面将使用英文')
  return 'compiler:Default.isl'
}

function cleanupLegacyAppPayloadArchives() {
  if (!fileExists(RELEASE_DIR)) return
  for (const name of readdirSync(RELEASE_DIR)) {
    if (!FORBIDDEN_STAGE_ARCHIVE.test(name)) continue
    const p = join(RELEASE_DIR, name)
    console.log(`[pack] 删除遗留整包归档: ${p}`)
    rmSync(p, { force: true })
  }
}

function listZipFilesUnder(dir) {
  const found = []
  if (!fileExists(dir)) return found
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name)
    if (ent.isDirectory()) found.push(...listZipFilesUnder(abs))
    else if (ent.name.toLowerCase().endsWith('.zip')) found.push(abs)
  }
  return found
}

/** 安装目录内不得包含任何 zip（图鉴包单独分发） */
function assertCleanStageForInno(stageDir) {
  const zips = listZipFilesUnder(stageDir)
  const forbidden = []
  const unexpected = []

  for (const abs of zips) {
    const rel = abs.slice(stageDir.length + 1).replace(/\\/g, '/')
    const base = rel.split('/').pop() ?? ''
    if (FORBIDDEN_STAGE_ARCHIVE.test(base)) forbidden.push(rel)
    else unexpected.push(rel)
  }

  if (forbidden.length) {
    console.error('[pack] 检测到禁止的整包归档（不可打入 ISS）：')
    for (const z of forbidden) console.error(`  - ${z}`)
    process.exit(1)
  }
  if (unexpected.length) {
    console.error('[pack] 安装目录中不应包含 .zip（图鉴包请单独分发）：')
    for (const z of unexpected) console.error(`  - ${z}`)
    process.exit(1)
  }
}

/** 安装包内仅 logo；图鉴 seed/配图/zip 均由 library-data-pack 单独分发 */
const FORBIDDEN_ASSET_DIRS = ['seed', 'library', 'packed', 'screenshots']

function stripExcludedAssetsFromStage(stageDir) {
  const assetsRoot = join(stageDir, 'resources', 'assets')
  if (!fileExists(assetsRoot)) return

  for (const name of FORBIDDEN_ASSET_DIRS) {
    const dir = join(assetsRoot, name)
    if (!fileExists(dir)) continue
    console.log(`[pack] 移除不应打入安装包的资源目录: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  }

  const strayZip = join(assetsRoot, 'packed', LIBRARY_PACK_NAME)
  if (fileExists(strayZip)) {
    console.log(`[pack] 移除安装目录内嵌图鉴 zip: ${strayZip}`)
    rmSync(strayZip, { force: true })
  }
}

function assertStageAssetsLayout(stageDir) {
  const assetsRoot = join(stageDir, 'resources', 'assets')
  if (!fileExists(assetsRoot)) return

  for (const name of FORBIDDEN_ASSET_DIRS) {
    if (fileExists(join(assetsRoot, name))) {
      console.error(`[pack] 安装目录仍含禁止资源: resources/assets/${name}`)
      console.error('[pack] 请检查是否仍复制了 assets/seed、library 或 packed（应仅含 logo）')
      process.exit(1)
    }
  }
}

async function applyExeIcon(stageDir, exeName, icoPath) {
  const exe = join(stageDir, exeName)
  if (!fileExists(exe)) {
    console.error(`[pack] 未找到 ${exe}`)
    process.exit(1)
  }
  console.log(`[pack] 设置 ${exeName} 图标 …`)
  await rcedit(exe, { icon: icoPath })
}

function findMainExe(stageDir) {
  const exes = readdirSync(stageDir).filter(
    (f) => f.endsWith('.exe') && !/^unins/i.test(f) && !/update/i.test(f)
  )
  if (!exes.length) {
    console.error(`[pack] 在 ${stageDir} 中未找到主程序 .exe`)
    process.exit(1)
  }
  return exes.find((f) => /^wanwu\.exe$/i.test(f)) ?? exes[0]
}

function logLibraryPackZip() {
  if (!fileExists(LIBRARY_PACK_ZIP)) {
    console.error(`[pack] 未找到 ${LIBRARY_PACK_ZIP}`)
    console.error('[pack] 请执行 npm run build，或去掉 --skip-library-pack / --skip-build')
    process.exit(1)
  }
  const st = statSync(LIBRARY_PACK_ZIP)
  const mb = (st.size / 1024 / 1024).toFixed(1)
  console.log(`[pack]   图鉴数据包: ${LIBRARY_PACK_ZIP}（${mb} MB）`)
}

function publishLibraryPackToRelease(version) {
  if (!fileExists(LIBRARY_PACK_ZIP)) return null
  mkdirSync(RELEASE_DIR, { recursive: true })
  const dest = join(RELEASE_DIR, `library-data-pack-${version}.zip`)
  copyFileSync(LIBRARY_PACK_ZIP, dest)
  const mb = (statSync(dest).size / 1024 / 1024).toFixed(1)
  console.log(`[pack]   单独分发: ${dest}（${mb} MB）`)
  return dest
}

function runBuild(skipLibraryPack) {
  const buildEnv = packBuildEnv(process.env)
  if (process.platform === 'win32') {
    const msvs = buildEnv.GYP_MSVS_VERSION
    console.log(
      msvs
        ? `[pack] MSVC: GYP_MSVS_VERSION=${msvs}`
        : '[pack] MSVC: 使用本机 Visual Studio（含 VS2026 时自动打 node-gyp 补丁）'
    )
  }
  if (skipLibraryPack) {
    logLibraryPackZip()
    console.log('[pack] 1/4  npm run build:app（跳过重新生成 library-data-pack.zip）…')
    execSync('npm run build:app', { cwd: ROOT, stdio: 'inherit', shell: true, env: buildEnv })
  } else {
    console.log('[pack] 1/4  npm run build（含图鉴 library-data-pack.zip）…')
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit', shell: true, env: buildEnv })
    if (!fileExists(LIBRARY_PACK_ZIP)) {
      console.error(`[pack] 未生成 ${LIBRARY_PACK_ZIP}，请检查 build-library-pack.ts`)
      process.exit(1)
    }
    logLibraryPackZip()
  }
}

function runElectronBuilder() {
  console.log('[pack] 2/4  electron-builder (win dir) …')
  const env = {
    ...packBuildEnv(process.env),
    CSC_IDENTITY_AUTO_DISCOVERY: 'false'
  }
  if (env.ELECTRON_MIRROR) {
    console.log(`[pack] ELECTRON_MIRROR=${env.ELECTRON_MIRROR}`)
  }
  const cmd = `npx electron-builder --win dir --config "${BUILDER_CONFIG}"`
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true, env })
      return
    } catch (err) {
      if (attempt >= maxAttempts) throw err
      console.warn(
        `[pack] electron-builder 失败（常见为下载 Electron 超时），${attempt + 1}/${maxAttempts} 次重试…`
      )
    }
  }
}

function runInnoSetup(iscc, innoVersion, setupVersion, stageDir, exeName, appIcon, chineseLang) {
  console.log('[pack] 4/4  Inno Setup（LZMA2 极限压缩）…')
  const outputBase = `wanwu-win-x64-${setupVersion}`
  const defines = [
    `/DAppVersion=${innoVersion}`,
    `/DSetupVersion=${setupVersion}`,
    `/DOutputBase=${outputBase}`,
    `/DOutputDir=${RELEASE_DIR}`,
    `/DStageDir=${stageDir}`,
    `/DAppExeName=${exeName}`,
    `/DChineseLangFile=${chineseLang}`
  ]
  execFileSync(iscc, [...defines, ISS_FILE], { cwd: ROOT, stdio: 'inherit' })
  console.log('')
  console.log(`[pack] ✓ 安装包: ${join(RELEASE_DIR, `${outputBase}.exe`)}`)
  console.log('')
}

async function main() {
  const { iscc: isccArg, skipBuild, skipLibraryPack } = parseArgs(process.argv.slice(2))
  const version = readAppVersion()

  if (!fileExists(ISS_FILE)) {
    console.error(`[pack] 缺少 ${ISS_FILE}`)
    process.exit(1)
  }

  const iscc = await resolveIscc(isccArg)
  const appIcon = ensureAppIco()
  const chineseLang = ensureChineseLangFile(iscc)
  console.log(`[pack] ISCC: ${iscc}`)
  console.log(`[pack] 图标: ${appIcon}`)

  if (!skipBuild) {
    runBuild(skipLibraryPack)
    publishLibraryPackToRelease(version)
    runElectronBuilder()
  } else {
    console.log('[pack] 已跳过 build 与 electron-builder（--skip-build）')
    logLibraryPackZip()
    publishLibraryPackToRelease(version)
  }

  const stageDir = findWinUnpackedDir()
  if (!stageDir) {
    console.error('[pack] 未找到 release/win-unpacked')
    process.exit(1)
  }

  cleanupLegacyAppPayloadArchives()
  stripExcludedAssetsFromStage(stageDir)
  assertStageAssetsLayout(stageDir)

  const exeName = findMainExe(stageDir)
  console.log(`[pack] 3/4  处理 ${exeName} …`)
  console.log(`[pack] 打包目录: ${stageDir}`)
  await applyExeIcon(stageDir, exeName, appIcon)

  assertCleanStageForInno(stageDir)
  console.log('[pack] 校验通过：安装目录无 zip，图鉴包单独分发')

  runInnoSetup(iscc, versionForInno(version), version, stageDir, exeName, appIcon, chineseLang)
}

main().catch((err) => {
  console.error('[pack] 失败:', err)
  process.exit(1)
})
