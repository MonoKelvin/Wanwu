# Release v1.1 — 变更说明

> 版本号以 `package.json` 为准。本文记录 v1.1 相对 v1.0.x 的主要交付与行为变更。

## 概述

v1.1 重点：**Windows 安装包**、**图鉴数据包独立分发**、**安装向导与数据目录统一**、**启动导入逻辑收紧**，并为后续性能与体积优化奠定基础。

## 安装与交付

| 交付物 | 说明 |
|--------|------|
| `wanwu-win-x64-x.y.z.exe` | Inno Setup 安装程序（逐文件安装 `win-unpacked`，非整包 zip） |
| `library-data-pack-x.y.z.zip` | 图鉴 SQLite + 配图，**单独下载**，不打进安装包 |
| 安装包内容 | 仅程序 + `assets/logo`；不含 `seed` / `library` / `packed` |

打包流程见 [pack/windows/README.md](../../pack/windows/README.md)。

## 安装向导

- **单页「数据与图鉴」**：个人数据与图鉴资源共用「设置目录」，自动创建 `wanwu` 子目录。
- 图鉴 zip 可选：可手填路径；留空时在设置目录或 `wanwu` 子目录查找 `library-data-pack.zip`。
- 安装后写入 `%APPDATA%/wanwu/wanwu-path.json`（`wanwuPath`、可选 `libraryPackPath`）。
- 未选择/未发现图鉴包时：**不**复制 zip、**不**预建图鉴解压目录。

## 图鉴数据导入

- 启动时按序发现 zip：`libraryPackPath` → 安装目录 → 数据目录（**不**自动扫描开发机 `assets/packed`）。
- 解压成功删除 zip；失败保留并 Toast 提示。
- 无 zip 时不创建 `resources/assets/library` 等配图解压目录。
- 支持安装程序通过子进程 `--installer-import-library-pack` 导入（见 `electron/services/library/installerImport.ts`）。

## 主进程与构建

- 新增 `electron/services/core/electronRuntime.ts`：`require('electron')` 惰性加载，修复 `tsx` 构建图鉴包时 `import { app } from 'electron'` 失败。
- `getWanwuDataDirectory()` 与 `resolveWanwuPath()` 分离：探测 zip 路径时不再顺带 `mkdir` 数据子目录。
- 图鉴 bootstrap 异步执行，不阻塞窗口创建（v1.1.1+ 继续优化启动通知与列表 IPC）。

## v1.1.2

- **云斋**模块初版：侧栏入口、展车页、`scene-renderer`、自定义导航图标。
- 云斋 3D 资源与 `item.json` 约定落地；README / 脚本说明精简。

## 云斋（cloud-abode，WIP）

- 侧栏新增 **云斋**，路由 `/cloud-abode/:slug?`；首车 `xiaomi-su7`（`items/xiaomi-su7/item.json`，id 为 UUID）。
- 通用 3D：`src/modules/scene-renderer`（Three.js r170、OrbitControls、HDR/PMREM、GLTF）。
- 展车：全屏画布、加载进度、底部 ColorBar 车身色；配置写入 `localStorage`。
- 车型 `item.json` 仅含模型与定制；展厅/HDR/BGM 等共用资源由 `cloud-abode` 模块配置引用。
- 云斋 3D 资源在 `assets/` 与 `showroomAssets.ts` 中维护；开发素材可参考 [su7-replica](https://github.com/alphardex/su7-replica)。

## v1.1.x 增量优化（文档与代码同步维护）

见 [roadmap-performance-packaging.md](roadmap-performance-packaging.md) Phase 1–2，已落地部分包括：

- 列表 `listItems` 轻量返回（不读 `content.md`、不扫目录、不加载 gallery）；SQL `LEFT JOIN` 一次取子分类名。
- 收藏列表批量 `IN` 查询，消除 N+1 `getItem`。
- `getItem` 使用 `itemCategoryCache` 跳过跨库线性扫描。
- 启动通知：`getStartupNotices` 不等待 bootstrap；失败/提示经 `app:startup-notice` 推送。
- `wanwu-media` 协议流式读文件；长图导出 `html2canvas` 动态加载。
- 打包：`asarUnpack` 仅原生 `.node`；`after-pack.mjs` 裁剪 `locales` 与非 win32 prebuild。

## 配置与忽略

- `package.json` 移除整包 `assets/` 的 `extraResources`。
- `.gitignore` 增加 `release/wanwu-payload-*`、`pack/app.ico` 等打包产物规则。

## 已知限制（v1.1 内未完全解决）

- 图鉴列表 IPC 仍为全量 `ItemDto`（含正文与图集解析），大分类切换可能偏慢 → 见 [roadmap-performance-packaging.md](roadmap-performance-packaging.md) Phase 1。
- 安装包体积主要来自 Electron 运行时与全量语言包 → 见路线图 Phase 2。
- 启动 Toast 若需等待图鉴导入完成才显示，可能延迟 → Phase 1 改为事件推送。

## 升级注意

- 从 v1.0 升级：保留 `%APPDATA%/wanwu` 数据；图鉴需单独下载 `library-data-pack-*.zip` 放入数据目录或安装时指定。
- 开发者：`npm run build` 仍会生成 `assets/packed/library-data-pack.zip`；正式包不会自动从该路径导入。
