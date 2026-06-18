# 业务模块开发指南

本文说明如何在 `src/modules/` 下**新增、接入、验证**业务模块。架构背景见 [`doc/design/module-plugin-architecture.md`](../../doc/design/module-plugin-architecture.md)。

> **维护约定**：注册机制、引导 glob、接口字段有变更时，请同步更新本文与 [`library/README.md`](./library/README.md)。

---

## 核心原则

| 原则 | 说明 |
|------|------|
| 热插拔 | 删除任意 `src/modules/<name>/` 后，主进程与渲染进程仍应能**编译、启动**（仅失去该模块能力） |
| 框架零业务 | `electron/`、`src/app/`、`src/shared/` 不得直接 `import` 业务模块（bootstrap **glob** 除外） |
| 自注册 | 模块通过 `register.ts` 注入能力，不在框架里写模块名硬编码 |
| 模块间通信 | 主进程通过 `getModuleRuntimeService(ctx, moduleId)`；渲染层通过路由、Store 或 `window.wanwu` |

---

## 标准目录结构

```
src/modules/<name>/
  app/
    register.ts              # 渲染进程注册入口（必须）
    *AppModule.ts            # IAppModule 实现
  main/                      # 需要 IPC / 本地服务时
    register.ts              # 主进程注册入口
    *MainModule.ts           # IMainProcessModule 实现
    preloadApi.ts            # Preload API（轻量，仅 ipcRenderer）
    service/                 # 主进程业务服务
    schema.ts                # user.sqlite 表结构（可选）
  preload/
    register.ts              # Preload 注册入口（有 IPC 时）
  domain/
    types.ts                 # 领域类型
    wanwuApi.ts              # WanwuApi 类型扩展（declare module）
    routes.ts                # 路由名 / 路径常量（可选）
  settings/                  # 设置面板（可选）
  views/ / components/ / services/ / stores/ ...
```

**推荐样板**

| 场景 | 参考模块 |
|------|----------|
| 独立顶栏模块（Shell + 侧栏） | `rss/`、`music/` |
| 全库子模块 | `library/leisure-read/`（见 [library/README.md](./library/README.md)） |
| 托盘 / 命令面板 | `quick-access/` |
| 仅渲染层、无 IPC | 可省略 `main/`、`preload/` |

---

## 三步引导（无需改框架代码）

框架通过 **eager glob** 自动发现模块，新增模块只需添加文件：

| 层 | 引导文件 | Glob 模式 |
|----|----------|-----------|
| 渲染进程 | `src/app/modules/moduleRegistryBootstrap.ts` | `src/modules/**/app/register.ts` |
| 主进程 | `electron/mainProcessBootstrap.ts` | `src/modules/**/main/register.ts` |
| Preload | `electron/preloadBootstrap.ts` | `src/modules/**/preload/register.ts` |

类型扩展：`src/app/platform/wanwuApiRegistry.ts` glob `src/modules/**/domain/wanwuApi.ts`。

---

## 新增模块 Checklist

### 1. 定义模块 ID

在 `domain/` 或 `domain/settings.ts` 中定义常量，例如：

```ts
export const MY_MODULE_ID = 'wanwu.my-feature' as const
```

若**其他模块**或框架桥接需要引用，在 `src/shared/module-bridge/moduleIds.ts` 增加导出。

### 2. 渲染进程 `app/register.ts`

```ts
import { registerAppModule } from '@app/modules/moduleRegistryCore'
import { myAppModule } from '@modules/my-feature/app/myAppModule'
import '@modules/my-feature/domain/wanwuApi'

registerAppModule(myAppModule)
```

### 3. 实现 `IAppModule`（`myAppModule.ts`）

按需实现下列钩子（均为可选，见下一节完整列表）。

### 4. 主进程（需要 IPC 时）

**`main/register.ts`**

```ts
import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { myMainModule } from './myMainModule'

registerMainProcessModule(myMainModule)
```

**`preload/register.ts`**

```ts
import { registerPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { myPreloadModule } from '../main/preloadApi'

registerPreloadModule(myPreloadModule)
```

> Preload **必须**独立于主进程模块图：仅放在 `main/preloadApi.ts`，禁止在 preload 侧 import `ipcMain`、Service 等主进程代码。

**`domain/wanwuApi.ts`**

```ts
export interface WanwuMyFeatureApi {
  myFeature: {
    doSomething: (id: string) => Promise<void>
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuMyFeatureApi {}
}
```

### 5. 验证

```bash
npm run check:mechanisms
npm run build:app
# 可选：临时重命名 src/modules/my-feature 后再次构建，确认热插拔
```

---

## 渲染进程注册机制（`IAppModule`）

实现文件：`src/app/modules/types.ts`  
注册入口：在 `*AppModule.ts` 内通过 `registerXxx(register)` 回调注册；`moduleRegistryCore.ts` 在 `registerAppModule` 时自动挂载。

| 钩子 | 注册函数 | 用途 | 示例模块 |
|------|----------|------|----------|
| `getModuleNav()` | （内置） | 顶栏主模块导航 | `rss`、`library/core` |
| `getRoutes()` | （内置） | 顶层 Vue Router 路由 | `rss`、`notes` |
| `getLibraryChildRoutes()` | （内置） | 挂在 `/library` 下的子路由 | `library/links` |
| `getLibrarySubmodule()` | （内置） | 全库侧栏 major + 分类树 | `library/leisure-read` |
| `loadShellView()` | （内置） | 主 Shell 视图懒加载 | `rss`、`library/core` |
| `loadItemDetailView()` | （内置） | 物品详情页（框架统一入口） | `library/illustrated-handbook` |
| `libraryHomeRouteName` | （字段） | 进入 `/library` 时的默认子路由 | `library/notes` |
| `commandContributor` | （字段） | 命令面板贡献项 | `library/notes` |
| `registerNavigation` | `registerNavigationContributor` | 路由切换前/后生命周期 | `library/notes` |
| `registerShellOutlet` | `registerShellOutletContributor` | 同一 URL 下 Outlet 视图切换 | `library/notes` |
| `registerBootMode` | `registerBootModeContributor` | 独立启动模式（便笺窗、托盘菜单等） | `library/notes`、`quick-access` |
| `registerMainAppIntegration` | `registerMainAppIntegration` | 主窗口挂载时执行一次 | `quick-access`、`library/notes` |
| `registerMainAppStartup` | `registerMainAppStartup` | 应用 idle 启动钩子 | `library/notes` |
| `registerAppShellOverlay` | `registerAppShellOverlay` | 主窗口叠加层（命令面板） | `quick-access` |
| `registerQuickAccess` | `registerQuickAccessTargetHandler` | 命令面板打开目标 | `rss`、`library/links` |
| `registerSettingsSection` | `registerSettingsSection` | 设置页左侧分区 | `rss`、`music`、`library/core` |
| `registerLibrarySettingsGroup` | `registerLibrarySettingsGroup` | 设置 → **全库** 内的分组 | `library/notes` |
| `registerSubPanel` | `registerSubPanelContributor` | 模块侧栏子面板 | `rss`、`library/core` |
| `registerShellChrome` | `registerShellChromeContributor` | Shell 顶栏扩展 | 按需 |
| `registerShellTheme` | `registerShellThemeContributor` | Shell 主题 class | 按需 |
| `registerPathMemory` | `registerPathMemoryContributor` | 路径记忆 / 恢复 | 按需 |
| `resolveLegacyLibraryPath` | （方法） | 旧 URL `/library/:cat` 重定向 | `library/links` |
| `belongsToLibraryPath` | （方法） | 判断路径是否属全库 | `library/notes` |

### 示例：独立模块 + 设置分区（RSS）

```ts
export const rssAppModule: IAppModule = {
  id: 'wanwu.rss',
  moduleId: 'rss',

  getModuleNav() {
    return { moduleId: 'rss', label: 'RSS', icon: 'globe', path: '/rss', order: 20 }
  },

  loadShellView() {
    return import('@modules/rss/RssView.vue').then((m) => m.default)
  },

  getRoutes() {
    return [{ path: '/rss/:feedId?', name: 'rss', component: () => import('...') }]
  },

  registerSettingsSection(register) {
    register({
      id: 'rss',
      label: 'RSS',
      icon: 'globe',
      order: 30,
      loadPanel: () => import('@modules/rss/settings/RssSettingsPanel.vue').then((m) => m.default)
    })
  }
}
```

### 示例：命令面板打开 handler

```ts
registerQuickAccess(register) {
  register({
    kind: 'rss',
    paletteMeta: { label: 'RSS', icon: 'inbox', order: 40 },
    async open(target, ctx) {
      await ctx.pushRoute({ name: 'rss', params: { feedId: target.feedId } })
    }
  })
}
```

### 设置面板：配置驱动 vs 自定义 UI

简单开关 / 分段选择优先用 `@shared/components/settings`：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { WwSettingsPanel } from '@shared/components/settings'
import type { WwSettingsField } from '@shared/components/settings'

const fields = computed((): WwSettingsField[] => [
  {
    type: 'toggle',
    label: '示例开关',
    modelValue: settings.value.xxx,
    onUpdate: async (v) => { await settingsStore.patchSetting('xxx', Boolean(v)) }
  }
])
</script>

<template>
  <WwSettingsPanel :fields="fields" />
</template>
```

复杂 UI（Provider 登录、多区块表单）再写独立 `settings/*.vue`，参考 `music/settings/MusicSettingsPanel.vue`。

### 模块专属设置字段

写入 `AppSettings.moduleSettings[moduleId]`，读写参考 `library/leisure-read/domain/settings.ts` 的 `readLeisureReadModuleSettings` / `patchModuleSettings`。

---

## 主进程注册机制（`IMainProcessModule`）

实现文件：`src/shared/module-bridge/mainProcessRegistry.ts`

| 钩子 | 用途 | 示例 |
|------|------|------|
| `order` | 初始化顺序（小者优先） | `quick-access`: 0 |
| `initServices` | 创建 Service，写入 `moduleRuntime` | `leisure-read` |
| `onModulesReady` | 跨模块依赖绑定 | `personal` → `library` |
| `registerIpcHandlers` | 注册 `ipcMain.handle` | 所有带 IPC 模块 |
| `registerDatabaseSchema` | 向 `user.sqlite` 注册表 | `leisure-read` |
| `searchQuickAccess` | 命令面板统一搜索 | `rss`、`library/links` |
| `getQuickAccessKindLimit` | 搜索 kind 限额与排序 | `{ kind: 'link', limit: 4, order: 40 }` |
| `getTrayStatusSlice` | 托盘 tooltip 数据 | `rss` |
| `getClipboardAssistHints` | 剪贴板联想 | `library/illustrated-handbook` |
| `onSettingsChanged` | 设置变更副作用 | `rss` 调度、`quick-access` 托盘 |
| `onDispose` | 退出 / 迁移前清理 | `quick-access` |

### 示例：主进程模块骨架

```ts
export const myMainModule: IMainProcessModule = {
  id: MY_MODULE_ID,
  order: 10,

  initServices(ctx) {
    setModuleRuntimeService(ctx, MY_MODULE_ID, createMyService(ctx))
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('my-feature:action', (_e, params) => {
      return getModuleRuntimeService<MyService>(ctx, MY_MODULE_ID)?.action(params)
    })
  },

  registerDatabaseSchema(db) {
    ensureMySchema(db)
  },

  onSettingsChanged(ctx, settings) {
    // 响应设置变更
  }
}
```

### Preload API

```ts
// main/preloadApi.ts
export const myPreloadModule: IPreloadModule = {
  id: MY_MODULE_ID,
  order: 10,
  getPreloadApi(ipcRenderer) {
    return {
      myFeature: {
        action: (params) => ipcRenderer.invoke('my-feature:action', params)
      }
    }
  }
}
```

---

## QuickAccess 渲染层桥接

命令面板的 kind 注册表在 `quick-access` 模块内；其他模块通过 `registerQuickAccess` 注入 **target handler**。

`quick-access/app/register.ts` 会调用 `bindQuickAccessRendererModule(...)` 绑定实现。删除 `quick-access` 模块后，框架侧 `quickAccessRendererBridge` 为 noop，不会白屏。

---

## 框架生命周期桥（可选）

`electron/app/frameworkLifecycleBridge.ts`：托盘、退出、库 bootstrap 等跨切面钩子，由 `quick-access`、`library/illustrated-handbook` 等模块注册。删除对应模块后回退为安全默认行为。

---

## 反模式

| 禁止 | 应改为 |
|------|--------|
| 在 `electron/`、`src/app/` 直接 `import '@modules/...'` | 仅 bootstrap glob + 模块自注册 |
| Preload import 主进程 Service / `ipcMain` | `main/preloadApi.ts` + `preload/register.ts` |
| 在 `AppServices` 上挂业务字段 | `moduleRuntime.get(moduleId)` |
| 在 `src/shared/types/` re-export 模块 domain 类型 | 模块内直引，或 `domain/wanwuApi.ts` |
| 修改框架 glob 列表才能加载新模块 | 遵循 `**/app/register.ts` 路径约定 |

---

## 删除模块验证

1. 重命名或删除 `src/modules/<name>/`
2. `npm run check:mechanisms`
3. `npm run build:app`
4. 启动应用，确认其余功能正常

---

## 相关文件索引

| 文件 | 职责 |
|------|------|
| `src/app/modules/moduleRegistryCore.ts` | 渲染模块注册与 wire |
| `src/app/modules/moduleRegistryBootstrap.ts` | 渲染 glob 引导 |
| `src/shared/module-bridge/mainProcessRegistry.ts` | 主进程模块接口 |
| `src/shared/module-bridge/preloadRegistry.ts` | Preload 模块接口 |
| `src/shared/module-bridge/moduleIds.ts` | 跨模块 ID 常量 |
| `electron/ipc/domains/appHandlers.ts` | 设置持久化与 `dispatchSettingsChanged` |
| `scripts/check-mechanism-boundaries.mjs` | 机制边界 CI 检查 |

全库子模块另有专门说明：[library/README.md](./library/README.md)。
