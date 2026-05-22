# Windows 安装包（Inno Setup）

## 一键打包

```bash
npm run pack
```

流程：

1. `npm run build` → `assets/packed/library-data-pack.zip`
2. 复制为 `release/library-data-pack-x.y.z.zip`（**单独分发，不打进安装包**）
3. `electron-builder` → `release/win-unpacked`（仅程序 + seed/logo，无图鉴 zip）
4. `rcedit` 为 `Wanwu.exe` 写入应用图标
5. Inno Setup → `release/wanwu-win-x64-x.y.z.exe`

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
| 数据与图鉴 | **同一向导页**：设置目录（自动建 `wanwu` 子目录）+ 可选图鉴 zip |
| 附加 | 桌面快捷方式 |
| 完成页 | 启动应用、打开发布页 |

## 可选参数

| 参数 | 说明 |
|------|------|
| `--skip-library-pack` | 不重新生成图鉴 zip（仍 `build:app`） |
| `--skip-build` | 跳过 build 与 electron-builder |
| `--iscc="路径"` | 指定 `ISCC.exe` |

```bash
npm run pack -- --skip-library-pack   # 只改代码
npm run pack -- --skip-build          # 只重打 Inno
```

环境变量 `INNO_SETUP_ISCC` 可指定编译器路径。

## 常见问题

### `Cannot create symbolic link` / `winCodeSign`

已在 `builder.json` 关闭签名；`Wanwu.exe` 图标由 `rcedit` 在打包后写入。若仍报错可开「开发人员模式」或删 `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign`。
