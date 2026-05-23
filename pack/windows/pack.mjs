#!/usr/bin/env node
/**
 * Windows 安装包：build → electron-builder → Inno Setup
 *
 *   node pack/windows/pack.mjs
 *   node pack/windows/pack.mjs --skip-library-pack
 *   node pack/windows/pack.mjs --skip-build
 *   node pack/windows/pack.mjs --no-clean
 *   node pack/windows/pack.mjs --iscc="D:\Inno Setup 7\ISCC.exe"
 */
import { execFileSync, execSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packBuildEnv } from '../../scripts/native-rebuild-env.mjs'
import {
  APP_COPYRIGHT,
  APP_DISPLAY_NAME,
  APP_ICO,
  PACK_DIR,
  ROOT,
  applyWinExeMetadata,
  c,
  findMainExe,
  packDim,
  packFail,
  packInfo,
  packOk,
  packStep,
  packWarn,
  readPackageMeta,
  signWindowsBinary,
  versionForInno
} from './pack-lib.mjs'

const ISS_FILE = join(PACK_DIR, 'wanwu.iss')
const BUILDER_CONFIG = join(PACK_DIR, 'builder.json')
const RELEASE_DIR = join(ROOT, 'release')
const PROJECT_CACHE_DIR = join(ROOT, '.cache')
const PROJECT_CACHE_PREFIX = 'wanwu-'
const LOGO_ICO_SCRIPT = join(ROOT, 'scripts', 'generate-app-ico.mjs')
const LOGO_PNG_SOURCE = join(ROOT, 'assets', 'logo', 'icon-256.png')
const LIBRARY_PACK_ZIP = join(ROOT, 'assets', 'packed', 'library-data-pack.zip')
const PACKED_ASSETS_DIR = join(ROOT, 'assets', 'packed')
const LIBRARY_PACK_NAME = 'library-data-pack.zip'
const LIBRARY_PACK_RELEASE_PATTERN = /^library-data-pack-.*\.zip$/i
const STAGE_DIR_NAME = 'win-unpacked'
const INSTALLER_EXE_PATTERN = /^wanwu-win-x64-.*\.exe$/i
const CHINESE_ISL = join(PACK_DIR, 'ChineseSimplified.isl')
const LICENSE_FILE = join(ROOT, 'LICENSE')
const FORBIDDEN_STAGE_ARCHIVE = /^wanwu-payload-.*\.(zip|7z)$/i
const FORBIDDEN_ASSET_DIRS = ['seed', 'library', 'packed']

const ISCC_NAME = 'ISCC.exe'
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
  let noClean = false
  for (const arg of argv) {
    if (arg === '--skip-build') skipBuild = true
    else if (arg === '--skip-library-pack') skipLibraryPack = true
    else if (arg === '--no-clean') noClean = true
    else if (arg.startsWith('--iscc=')) iscc = arg.slice(7).trim().replace(/^["']|["']$/g, '')
  }
  return { iscc, skipBuild, skipLibraryPack, noClean }
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
    const re = /REG_SZ\s+(.+)$/im
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

function discoverIsccCandidates(explicit) {
  const seen = new Set()
  const list = []
  const add = (p) => {
    const v = p?.trim().replace(/^["']|["']$/g, '')
    if (!v || seen.has(v)) return
    seen.add(v)
    list.push(v)
  }

  add(explicit)
  add(process.env.INNO_SETUP_ISCC)

  if (process.platform === 'win32') {
    try {
      const out = execSync('where ISCC', { encoding: 'utf8', windowsHide: true })
      for (const line of out.split(/\r?\n/)) {
        const p = line.trim()
        if (p && fileExists(p)) add(p)
      }
    } catch {
      /* ignore */
    }

    for (const key of INNO_UNINSTALL_KEYS) {
      const dir =
        regQueryValue(key, 'Inno Setup: App Path') ?? regQueryValue(key, 'InstallLocation')
      if (dir) {
        const p = join(dir.replace(/[\\/]+$/, ''), ISCC_NAME)
        if (fileExists(p)) add(p)
      }
    }

    for (const root of [
      process.env['ProgramFiles(x86)'],
      process.env.ProgramFiles,
      process.env.ProgramW6432
    ].filter(Boolean)) {
      for (const name of ['Inno Setup 7', 'Inno Setup 6']) {
        const p = join(root, name, ISCC_NAME)
        if (fileExists(p)) add(p)
      }
    }
  }

  for (const p of ISCC_STATIC_CANDIDATES) add(p)
  return list.filter((p) => fileExists(p))
}

async function promptIsccPath() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    console.log('\n[pack] 未找到 Inno Setup 编译器 ISCC.exe')
    console.log('[pack] 请安装 Inno Setup 7：https://jrsoftware.org/isdl.php')
    rl.question('[pack] 请输入 ISCC.exe 完整路径: ', (line) => {
      rl.close()
      resolve(line.trim().replace(/^["']|["']$/g, ''))
    })
  })
}

async function resolveIscc(explicit) {
  const found = discoverIsccCandidates(explicit)
  if (found.length > 0) {
    if (found.length > 1) packInfo(`已自动定位 ISCC（${found.length} 处候选，使用首个）`)
    return found[0]
  }

  const entered = await promptIsccPath()
  if (entered && fileExists(entered)) return entered
  const fromDir = entered ? join(entered.replace(/[\\/]+$/, ''), ISCC_NAME) : ''
  if (fromDir && fileExists(fromDir)) return fromDir

  packFail('无效路径或未找到 ISCC.exe（可设 INNO_SETUP_ISCC 或 --iscc=）')
  process.exit(1)
}

function findWinUnpackedDir() {
  if (!fileExists(RELEASE_DIR)) return null
  const direct = join(RELEASE_DIR, STAGE_DIR_NAME)
  if (fileExists(direct)) return direct
  for (const ent of readdirSync(RELEASE_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue
    const nested = join(RELEASE_DIR, ent.name, STAGE_DIR_NAME)
    if (fileExists(nested)) return nested
  }
  return null
}

function ensureAppIco() {
  if (!fileExists(LOGO_PNG_SOURCE)) {
    packFail(`缺少软件图标源图: ${LOGO_PNG_SOURCE}`)
    process.exit(1)
  }
  const needRegen =
    !fileExists(APP_ICO) || statSync(LOGO_PNG_SOURCE).mtimeMs > statSync(APP_ICO).mtimeMs
  if (needRegen) {
    packInfo('从 assets/logo/icon-256.png 生成 pack/app.ico …')
    execFileSync(process.execPath, [LOGO_ICO_SCRIPT], { cwd: ROOT, stdio: 'inherit' })
  }
  if (!fileExists(APP_ICO) || statSync(APP_ICO).size < 1024) {
    packFail('pack/app.ico 未生成或体积异常，请执行 npm run logo:ico')
    process.exit(1)
  }
  return APP_ICO
}

function ensureChineseLangFile(iscc) {
  if (fileExists(CHINESE_ISL)) return CHINESE_ISL
  const fromInno = join(dirname(dirname(iscc)), 'Languages', 'ChineseSimplified.isl')
  if (fileExists(fromInno)) {
    copyFileSync(fromInno, CHINESE_ISL)
    return CHINESE_ISL
  }
  packWarn('未找到中文语言文件，安装界面将使用英文')
  return 'compiler:Default.isl'
}

function cleanReleaseBeforePack({ skipBuild, skipLibraryPack, noClean }) {
  if (noClean) {
    packInfo('已跳过 release / .cache / 图鉴 zip 清理（--no-clean）')
    return
  }

  mkdirSync(RELEASE_DIR, { recursive: true })
  packDim('清理 release 旧产物…')

  if (fileExists(RELEASE_DIR)) {
    for (const name of readdirSync(RELEASE_DIR)) {
      const p = join(RELEASE_DIR, name)
      if (FORBIDDEN_STAGE_ARCHIVE.test(name) || INSTALLER_EXE_PATTERN.test(name)) {
        packDim(`清理: ${p}`)
        rmSync(p, { force: true })
      }
    }
    for (const name of ['builder-debug.yml', 'builder-effective-config.yaml']) {
      const p = join(RELEASE_DIR, name)
      if (fileExists(p)) {
        packDim(`清理: ${p}`)
        rmSync(p, { force: true })
      }
    }
  }

  if (!skipLibraryPack && !skipBuild) {
    packDim('清理图鉴 zip 旧产物…')
    if (fileExists(PACKED_ASSETS_DIR)) {
      for (const name of readdirSync(PACKED_ASSETS_DIR)) {
        if (/\.zip$/i.test(name)) rmSync(join(PACKED_ASSETS_DIR, name), { force: true })
      }
    }
    if (fileExists(RELEASE_DIR)) {
      for (const name of readdirSync(RELEASE_DIR)) {
        if (LIBRARY_PACK_RELEASE_PATTERN.test(name)) {
          rmSync(join(RELEASE_DIR, name), { force: true })
        }
      }
    }
    if (fileExists(PROJECT_CACHE_DIR)) {
      for (const ent of readdirSync(PROJECT_CACHE_DIR, { withFileTypes: true })) {
        if (!ent.isDirectory() || !ent.name.startsWith(PROJECT_CACHE_PREFIX)) continue
        rmSync(join(PROJECT_CACHE_DIR, ent.name), { recursive: true, force: true })
      }
    }
  }

  if (!skipBuild) {
    const direct = join(RELEASE_DIR, STAGE_DIR_NAME)
    if (fileExists(direct)) {
      packDim(`清理 staging: ${direct}`)
      rmSync(direct, { recursive: true, force: true })
    }
  } else {
    packInfo('--skip-build：保留现有 win-unpacked')
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

function stripExcludedAssetsFromStage(stageDir) {
  const assetsRoot = join(stageDir, 'resources', 'assets')
  if (!fileExists(assetsRoot)) return
  for (const name of FORBIDDEN_ASSET_DIRS) {
    const dir = join(assetsRoot, name)
    if (!fileExists(dir)) continue
    packDim(`移除资源目录: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  }
}

function assertStageClean(stageDir) {
  const zips = listZipFilesUnder(stageDir)
  const bad = []
  for (const abs of zips) {
    const rel = abs.slice(stageDir.length + 1).replace(/\\/g, '/')
    const base = rel.split('/').pop() ?? ''
    if (FORBIDDEN_STAGE_ARCHIVE.test(base)) {
      packFail(`禁止打入 ISS 的归档: ${rel}`)
      process.exit(1)
    }
    bad.push(rel)
  }
  if (bad.length) {
    packFail(`安装目录不应含 .zip: ${bad.join(', ')}`)
    process.exit(1)
  }
  const assetsRoot = join(stageDir, 'resources', 'assets')
  if (fileExists(assetsRoot)) {
    for (const name of FORBIDDEN_ASSET_DIRS) {
      if (fileExists(join(assetsRoot, name))) {
        packFail(`安装目录仍含禁止资源: resources/assets/${name}`)
        process.exit(1)
      }
    }
  }
}

function logLibraryPackZip() {
  if (!fileExists(LIBRARY_PACK_ZIP)) {
    packFail(`未找到 ${LIBRARY_PACK_ZIP}`)
    process.exit(1)
  }
  const mb = (statSync(LIBRARY_PACK_ZIP).size / 1024 / 1024).toFixed(1)
  packDim(`图鉴数据包: ${LIBRARY_PACK_ZIP}（${mb} MB）`)
}

function publishLibraryPackToRelease(version) {
  if (!fileExists(LIBRARY_PACK_ZIP)) return null
  mkdirSync(RELEASE_DIR, { recursive: true })
  const dest = join(RELEASE_DIR, `library-data-pack-${version}.zip`)
  if (fileExists(dest)) rmSync(dest, { force: true })
  copyFileSync(LIBRARY_PACK_ZIP, dest)
  packDim(`单独分发: ${dest}（${(statSync(dest).size / 1024 / 1024).toFixed(1)} MB）`)
  return dest
}

function runBuild(skipLibraryPack) {
  const env = packBuildEnv(process.env)
  if (skipLibraryPack) {
    packStep(1, 4, 'npm run build:app …')
    execSync('npm run build:app', { cwd: ROOT, stdio: 'inherit', shell: true, env })
  } else {
    packStep(1, 4, 'npm run build（含图鉴包）…')
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit', shell: true, env })
    if (!fileExists(LIBRARY_PACK_ZIP)) {
      packFail(`未生成 ${LIBRARY_PACK_ZIP}`)
      process.exit(1)
    }
  }
  logLibraryPackZip()
}

function runElectronBuilder() {
  packStep(2, 4, 'electron-builder (win dir) …')
  const env = { ...packBuildEnv(process.env), CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
  const cmd = `npx electron-builder --win dir --config "${BUILDER_CONFIG}"`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true, env })
      return
    } catch {
      if (attempt >= 3) throw new Error('electron-builder 失败')
      packWarn(`electron-builder 失败，${attempt + 1}/3 次重试…`)
    }
  }
}

function runInnoSetup(iscc, innoVersion, setupVersion, stageDir, exeName, chineseLang) {
  if (!fileExists(LICENSE_FILE)) {
    packFail(`缺少 ${LICENSE_FILE}`)
    process.exit(1)
  }
  packStep(4, 4, 'Inno Setup（LZMA2 极限压缩）…')
  const outputBase = `wanwu-win-x64-${setupVersion}`
  execFileSync(
    iscc,
    [
      `/DAppVersion=${innoVersion}`,
      `/DSetupVersion=${setupVersion}`,
      `/DOutputBase=${outputBase}`,
      `/DOutputDir=${RELEASE_DIR}`,
      `/DStageDir=${stageDir}`,
      `/DAppExeName=${exeName}`,
      `/DChineseLangFile=${chineseLang}`,
      `/DLicenseFile=${LICENSE_FILE}`,
      `/DAppCopyright=${APP_COPYRIGHT}`,
      ISS_FILE
    ],
    { cwd: ROOT, stdio: 'inherit' }
  )
  const setupPath = join(RELEASE_DIR, `${outputBase}.exe`)
  signWindowsBinary(setupPath, { label: '安装包' })
  return setupPath
}

async function main() {
  const { iscc: isccArg, skipBuild, skipLibraryPack, noClean } = parseArgs(process.argv.slice(2))
  const { version } = readPackageMeta()

  if (!fileExists(ISS_FILE)) {
    packFail(`缺少 ${ISS_FILE}`)
    process.exit(1)
  }

  const iscc = await resolveIscc(isccArg)
  const appIcon = ensureAppIco()
  const chineseLang = ensureChineseLangFile(iscc)

  packInfo(`打包 ${APP_DISPLAY_NAME} v${version}`)
  packInfo(`ISCC: ${c.dim(iscc)}`)

  try {
    cleanReleaseBeforePack({ skipBuild, skipLibraryPack, noClean })

    if (!skipBuild) {
      runBuild(skipLibraryPack)
      publishLibraryPackToRelease(version)
      runElectronBuilder()
    } else {
      packInfo('已跳过 build 与 electron-builder（--skip-build）')
      logLibraryPackZip()
      publishLibraryPackToRelease(version)
    }

    const stageDir = findWinUnpackedDir()
    if (!stageDir) {
      packFail('未找到 release/win-unpacked')
      process.exit(1)
    }

    let exeName
    try {
      exeName = findMainExe(stageDir)
    } catch (err) {
      packFail(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }

    packStep(skipBuild ? 1 : 3, skipBuild ? 2 : 4, `校验安装目录 · ${exeName}`)
    stripExcludedAssetsFromStage(stageDir)
    await applyWinExeMetadata(stageDir, { icoPath: appIcon, exeName, log: packDim })
    signWindowsBinary(join(stageDir, exeName), { label: exeName })
    assertStageClean(stageDir)
    packOk('校验通过')

    const setupPath = runInnoSetup(
      iscc,
      versionForInno(version),
      version,
      stageDir,
      exeName,
      chineseLang
    )
    packOk(`安装包 ${setupPath}`)
  } catch (err) {
    packFail(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main().catch((err) => {
    packFail(String(err))
    process.exit(1)
  })
}
