# 模块插件化架构

> **实操指南**（新增模块步骤与注册示例）：[`src/modules/README.md`](../../src/modules/README.md) · 全库子模块：[`src/modules/library/README.md`](../../src/modules/library/README.md)

本文描述万物（Wanwu）**双层热插拔插件**约定：删除任意 `src/modules/**` 业务目录后，应用仍可编译、启动，仅失去该模块能力。

## 目标

| 验收项 | 命令 / 操作 |
|--------|-------------|
| 机制边界 | `npm run check:mechanisms` |
| 主进程构建 | `node scripts/electron-vite.mjs build`（main + preload 必须通过） |
| 热插拔 | 临时重命名 `src/modules/<name>/` 后重复构建，确认无框架硬编码 import |

**默认可删除**：设置模块、QuickAccess/托盘、全库 Shell（`library/core`）。框架核心仅保留：启动引导、窗口/Shell IPC、`DatabaseService` 壳、`UserDataGateway`、注册表机制。

---

## 目录结构

```
src/modules/<name>/
  app/
    register.ts              # 渲染进程注册入口（glob 引导）
    *AppModule.ts            # IAppModule 实现
  main/                      # 可选：有主进程能力时
    register.ts              # 主进程注册入口（glob 引导）
    *MainModule.ts           # IMainProcessModule 实现
    service.ts               # 从 electron/services 迁入（逐步）
    schema.ts                # DB schema（如有）
  domain/
    moduleId.ts              # 模块 ID 常量
    types.ts                 # 领域类型
    wanwuApi.ts              # WanwuApi augmentation
  settings/                  # 可选：设置分区组件
  providers/                 # 可选：扩展点实现
```

**参考样板**：`src/modules/library/leisure-read/`（闲读，首个完整双层插件）。

---

## 双层接口

### 渲染进程 — `IAppModule`

| 钩子 | 职责 |
|------|------|
| `registerRoutes` | Vue Router 路由 |
| `registerNavItems` | 侧栏导航项 |
| `registerSettingsSections` | 设置页分区 |
| `registerQuickAccessKinds` | 命令面板 kind 与打开逻辑 |
| `registerLibrarySubmodule` | 文库 major / catalog contributor |
| `getShellModule` | 独立 Shell 模块描述 |

注册入口：`src/app/modules/moduleRegistryBootstrap.ts` glob `**/app/register.ts`。

### 主进程 — `IMainProcessModule`

| 钩子 | 职责 |
|------|------|
| `initServices` | 创建模块 Service，写入 `moduleRuntime` |
| `onModulesReady` | 跨模块依赖绑定（如 personal → library） |
| `registerIpcHandlers` | `ipcMain.handle` / `on` |
| `registerDatabaseSchema` | 向 `user.sqlite` 注册表结构 |
| Preload：`preload/register.ts` + `main/preloadApi.ts` | 合并到 `window.wanwu`（与主进程模块图分离） |
| `searchQuickAccess` | QuickAccess 统一搜索贡献 |
| `getQuickAccessKindLimit` | kind 限额与排序 |
| `getTrayStatusSlice` | 托盘 tooltip 数据切片 |
| `getClipboardAssistHints` | 剪贴板联想 |
| `onSettingsChanged` | 设置变更副作用（如 RSS 自动刷新调度） |
| `onDispose` | 应用退出 / 数据迁移前清理 |

注册入口：`electron/mainProcessBootstrap.ts` glob `**/main/register.ts`；Preload：`electron/preloadBootstrap.ts` glob `**/preload/register.ts`。

**框架生命周期桥**（`electron/app/frameworkLifecycleBridge.ts`）：可选模块注册 `isAppQuitting`、`disposeQuickAccess`、`syncQuickAccessFromSettings`、`waitForLibraryBootstrap` 等跨切面钩子；删除模块后回退为安全默认行为。

**QuickAccess / 托盘**：独立模块 `src/modules/quick-access/`，IPC 由 `registerIpcHandlers` 注册，托盘状态由各模块 `getTrayStatusSlice` 聚合（`trayStatus.ts`）。

---

## 框架核心服务

瘦身后 `AppServices` / `MainProcessCoreServices` 仅含：

- `db: DatabaseService`
- `userData: UserDataGateway`
- `media: MediaService`
- `moduleRuntime: Map<string, unknown>`

模块间通过 `getModuleRuntimeService(ctx, moduleId)` 或 `electron/app/moduleRuntimeBridge.ts` 获取服务。**禁止**在 `electron/main.ts` 硬编码业务 Service。

`electron/preload.ts` 仅保留 **app / window / shell / share / cloudAbode** 核心块，其余由 `mergeModulePreloadApi()` 合并各模块 `getPreloadApi`。

---

## 设置与 `moduleSettings`

框架级 `AppSettings` 保留：导航、主题、启动模块、托盘/关闭行为、`dailyWidgetEnabled`、`clipboardAssistEnabled`、`moduleSettings`。

模块专属字段（如 `rssFetchLimit`、`music*`、`notesPopoutRestore`、`diagramRecentShapes`）通过 `moduleSettings[moduleId]` 存储；`normalizeAppSettings` 含旧字段双向迁移（参见闲读 `leisureRead*` 模式）。

设置分区 ID 为 `string`；RSS/Music 等面板已迁入各自模块 `settings/`。设置模块仅保留 `app`、`data`、`about` 三个框架向分区。

---

## 扩展点清单（渲染）

- **导航**：`registerModuleNavItem` — `src/app/modules/moduleNavRegistry.ts`
- **设置**：`registerSettingsSection` — `settingsSectionRegistry.ts`
- **QuickAccess kind**：`registerQuickAccessKind` — `quickAccessKindRegistry.ts`
- **文库 major**：`registerLibraryMajor` — `libraryMajorRegistry.ts`
- **文库 catalog**：`ILibraryCatalogContributor` — `librarySubmoduleTypes.ts`

---

## 模块间依赖规范

1. 仅通过 `moduleRuntime` + `moduleId` 通信，禁止框架 import 业务类型。
2. 有依赖时在 `onModulesReady` 绑定（init 顺序由 `order` 字段控制）。
3. 模块 ID 常量集中在 `src/shared/module-bridge/moduleIds.ts`（框架桥接用）。

---

## 新增模块 Checklist

- [ ] `domain/moduleId.ts` 定义 ID
- [ ] `app/register.ts` + `IAppModule`（路由、导航）
- [ ] `domain/wanwuApi.ts` augmentation
- [ ] 需要 IPC 时：`main/register.ts` + `IMainProcessModule`
- [ ] `getPreloadApi` 暴露 API
- [ ] QuickAccess：`searchQuickAccess` + 渲染层 `registerQuickAccessKind`
- [ ] 设置：`settings/*.vue` + `registerSettingsSections`
- [ ] 文库子模块：`registerLibrarySubmodule` + catalog contributor
- [ ] `npm run check:mechanisms` 通过
- [ ] 重命名模块目录后 `node scripts/electron-vite.mjs build` 仍通过

---

## 删除模块验证步骤

1. 将 `src/modules/<name>/` 重命名为 `<name>.disabled`（或删除 `main/register.ts` / `app/register.ts`）。
2. `npm run check:mechanisms`
3. `node scripts/electron-vite.mjs build`
4. 启动应用冒烟：主窗口、托盘（若保留）、其它模块功能正常。

---

## 反模式

| 禁止 | 说明 |
|------|------|
| `electron/main.ts` 直接 `new XxxService()` | 应迁入模块 `initServices` |
| `electron/preload.ts` 硬编码业务 API | 应使用 `getPreloadApi` |
| `src/app/`、`src/shared/`（非 types 兼容层）`import '@modules/...'` | 边界检查会失败 |
| `electron/ipc/domains/*Handlers.ts` 业务 handler | 应迁入模块 `registerIpcHandlers` |
| 框架访问 `services.library` 等废弃字段 | 使用 `moduleRuntimeBridge` |

---

## 关键文件索引

| 用途 | 路径 |
|------|------|
| 渲染注册 | `src/app/modules/moduleRegistryCore.ts` |
| 渲染引导 | `src/app/modules/moduleRegistryBootstrap.ts` |
| 主进程注册 | `src/shared/module-bridge/mainProcessRegistry.ts` |
| 主进程引导 | `electron/mainProcessBootstrap.ts` |
| 运行时桥接 | `electron/app/moduleRuntimeBridge.ts` |
| 生命周期桥 | `electron/app/frameworkLifecycleBridge.ts` |
| 窗口广播 | `electron/app/windowBroadcast.ts` |
| DB schema 桥 | `electron/app/databaseSchemaBridge.ts` |
| QuickAccess 模块 | `src/modules/quick-access/main/` |
| 边界检查 | `scripts/check-mechanism-boundaries.mjs` |
| 闲读参考 | `src/modules/library/leisure-read/main/leisureReadMainModule.ts` |
