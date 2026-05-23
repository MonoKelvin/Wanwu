# Windows 安装包（Inno Setup）

## 一键打包

```bash
npm run pack
```

流程：

0. **清理** `release/` 旧产物（见下）
1. `npm run build` → `assets/packed/library-data-pack.zip`
2. 复制为 `release/library-data-pack-x.y.z.zip`（**单独分发，不打进安装包**）
3. `electron-builder` → 全新 `release/win-unpacked`（仅程序 + logo，无图鉴 zip）
4. 从 `assets/logo/icon-256.png` 生成 `pack/app.ico`（png2icons / Windows 兼容 ICO）
5. `rcedit` 为 `Wanwu.exe` 写入 `app.ico`
6. Inno Setup → `release/wanwu-win-x64-x.y.z.exe`（`SetupIconFile` 同为 `app.ico`）

需安装 [Inno Setup 7](https://jrsoftware.org/isdl.php)。简体中文语言文件：`pack/windows/ChineseSimplified.isl`。

**禁止**将整应用打成 zip 塞进 ISS，否则无法干净卸载。

安装包内 **仅含** `assets/logo`。图鉴种子、配图与 SQLite 均在 `library-data-pack-*.zip` 中单独发布，勿把 `assets/seed`、`assets/library`、`assets/packed` 打进 `extraResources`。

## 发布物

| 文件 | 说明 |
|------|------|
| `wanwu-win-x64-x.y.z.exe` | 安装程序 |
| `library-data-pack-x.y.z.zip` | 图鉴数据（用户安装时可选，或稍后手动放入数据目录） |

## 安装程序

| 步骤 | 说明 |
|------|------|
| 安装路径 | 默认 `C:\Program Files (x86)\Wanwu` |
| 用户数据和资源设置 | **同一向导页**：数据目录（直接存放 db/media/cache）+ 可选资源包 zip |
| 附加 | 桌面快捷方式 |
| 完成页 | 启动应用、打开发布页 |

## 打包前清理

默认每次 `npm run pack` 会先清理 `release/`，避免上次文件污染本次安装包：

| 清理对象 | 完整打包 | `--skip-build` |
|----------|----------|----------------|
| `release/win-unpacked` | 删除后重建 | **保留** |
| `wanwu-win-x64-*.exe` | 删除 | 删除 |
| `library-data-pack-{当前版本}.zip` | 删除后重新复制 | 删除后重新复制 |
| `wanwu-payload-*.zip` 等整包归档 | 删除 | 删除 |
| `builder-debug.yml` 等 | 删除 | 删除 |
| `.cache/wanwu-*`（图鉴构建/读 zip 临时目录） | 删除 | 不删 |
| `assets/packed/*.zip` | 删除（重建图鉴包时） | 保留 |
| `release/library-data-pack-*.zip` | 删除（重建图鉴包时） | 保留 |

`.cache` 与 `assets/packed` **不会**打进程序安装包；清理它们是为了图鉴 **单独 zip** 构建时不混入旧 SQLite/旧 zip。`build-library-pack.ts` 开头也会清理，pack 在完整流程里再清一次是双保险。

保留全部 release 内容时可加 `--no-clean`（同时跳过 `.cache` 清理）。

## 可选参数

| 参数 | 说明 |
|------|------|
| `--skip-library-pack` | 不重新生成图鉴 zip（仍 `build:app`） |
| `--skip-build` | 跳过 build 与 electron-builder |
| `--no-clean` | 跳过 release 清理（保留 win-unpacked、旧安装包等） |
| `--iscc="路径"` | 指定 `ISCC.exe` |

打包体积优化（v1.1+）：`builder.json` 仅解包原生 `.node`；`pack-lib.mjs`（electron-builder afterPack）裁剪 `locales` 为 `zh-CN` / `en-US` 并写入 exe 文件信息。详见 [doc/optimization/roadmap-performance-packaging.md](../../doc/optimization/roadmap-performance-packaging.md)。

## 脚本结构

| 文件 | 说明 |
|------|------|
| `pack.mjs` | 打包入口（清理 → build → electron-builder → Inno） |
| `pack-lib.mjs` | 日志、exe 元数据/签名、electron-builder afterPack |
| `builder.json` | electron-builder 配置 |
| `wanwu.iss` / `wizard.iss` | Inno Setup 安装脚本 |

```bash
npm run pack -- --skip-library-pack   # 只改代码
npm run pack -- --skip-build          # 只重打 Inno
```

打包脚本会按顺序自动查找 `ISCC.exe`：

1. 参数 `--iscc=`、环境变量 `INNO_SETUP_ISCC`
2. 系统 `PATH`（`where ISCC`）
3. 注册表卸载项 `Inno Setup: App Path` / `InstallLocation`（HKLM/HKCU，6/7）
4. `%ProgramFiles%` / `%ProgramFiles(x86)%` 下 `Inno Setup 7` 等常见目录

仍找不到时再提示手动输入路径。

## 代码签名（可选）

打包完成后会尝试用 `signtool` 签名 `Wanwu.exe` 与安装包。**未安装 Windows SDK 时只会打出警告，不影响打包成功。**

| 环境变量 | 说明 |
|----------|------|
| `WANWU_SKIP_SIGN=1` | 跳过签名且不提示 |
| `WANWU_SELF_SIGN=1` | 开发用自签证书（需已安装 Windows SDK） |
| `WANWU_SIGN_PFX` | 正式证书 `.pfx` 路径 |
| `WANWU_SIGN_PASSWORD` | 证书密码（可选） |

安装 Windows SDK（Visual Studio 安装器 → 单个组件 → **Windows SDK**）后 `signtool` 即可用。正式证书签名示例：

```powershell
$env:WANWU_SIGN_PFX = "C:\certs\wanwu.pfx"
$env:WANWU_SIGN_PASSWORD = "your-password"
npm run pack
```

## 常见问题

### `Cannot create symbolic link` / `winCodeSign`

已在 `builder.json` 关闭签名；`Wanwu.exe` 图标由 `rcedit` 在打包后写入。若仍报错可开「开发人员模式」或删 `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign`。

### `Could not find any Visual Studio` / `unknown version "undefined"`（VS 2026）

`npm run pack` 会为子进程设置 `GYP_MSVS_VERSION=2022`（可用环境变量覆盖）。请安装 **Visual Studio 2022 生成工具** 或 VS2026 并勾选「使用 C++ 的桌面开发」，且本机需有 **Windows 10/11 SDK**。

仅缺 `electron-native-share` 时，打包仍会继续（系统分享不可用）；修复后执行 `npm run rebuild`。

### `connect ETIMEDOUT` 下载 Electron

打包默认使用 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`（可改环境变量）。失败会自动重试 3 次。也可先 `npm install` 确保 `node_modules/electron` 存在后再 `npm run pack`。
