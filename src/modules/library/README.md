# 全库（Library）子模块开发指南

本文说明如何在 `src/modules/library/` 下新增**全库子模块**（链接、便笺、图鉴、闲读等），并接入侧栏、路由、设置与 QuickAccess。

> **维护约定**：全库相关注册机制变更时，请同步更新本文与 [`../README.md`](../README.md)。

---

## 全库架构概览

```
src/modules/library/
  core/                    # 全库 Shell（侧栏壳、/library 路由聚合）— 可热插拔
  links/                   # 子模块：链接
  notes/                   # 子模块：便笺
  illustrated-handbook/    # 子模块：图鉴
  diagrams/                # 子模块：流程图
  leisure-read/            # 子模块：闲读
  LibraryShellView.vue     # 全库根视图
```

| 层级 | 职责 |
|------|------|
| `library/core` | 顶栏「全库」导航、`/library` 父路由、legacy 重定向、设置页「全库」分区 |
| `library/<submodule>` | 具体业务能力：路由、侧栏 major、IPC、视图 |

**Major（大分类）** 不再在 `core/config/majors.ts` 硬编码，而是由各子模块 `getLibrarySubmodule().major` **运行时聚合**（`collectLibraryMajors()`）。

---

## 何时放在 `library/` 下

适合放入全库的子模块通常满足：

- 入口在 **全库侧栏** 中展示为一个 major
- 路由挂在 `/library/...`（或与之等价的顶层路径，如便笺 `/notes`）
- 与「资料库 / 收藏 / 链接 / 笔记」同类的心智模型

独立顶栏模块（如 RSS、音乐、个人）应放在 `src/modules/<name>/`，见 [`../README.md`](../README.md)。

---

## 新增全库子模块 Checklist

以新增 `library/my-module` 为例：

### 1. 创建目录

```
src/modules/library/my-module/
  app/
    register.ts
    myModuleAppModule.ts
  domain/
    types.ts
    wanwuApi.ts          # 有 window.wanwu 时
    routes.ts            # 路由名常量
  views/
    MyModuleView.vue
  main/                  # 需要 IPC 时
    register.ts
    myModuleMainModule.ts
    preloadApi.ts
  preload/
    register.ts
  settings/              # 可选
    MyModuleSettingsPanel.vue
```

### 2. `app/register.ts`

```ts
import { registerAppModule } from '@app/modules/moduleRegistryCore'
import { myModuleAppModule } from '@modules/library/my-module/app/myModuleAppModule'
import '@modules/library/my-module/domain/wanwuApi'

registerAppModule(myModuleAppModule)
```

Glob 会自动加载，**无需**修改 `library/core`。

### 3. 注册全库子路由 — `getLibraryChildRoutes()`

子路由挂载在 `/library` 下，路径**不要**写前缀 `/library`：

```ts
getLibraryChildRoutes() {
  return [
    {
      path: 'my-module/:id?',
      name: 'library-my-module',
      component: () => import('@modules/library/my-module/views/MyModuleView.vue'),
      meta: { module: 'library', major: 'my-module', title: '我的模块' }
    }
  ]
}
```

`library/core` 的 `getRoutes()` 会通过 `collectLibraryChildRoutes()` 自动合并。

### 4. 注册侧栏 Major — `getLibrarySubmodule()`

```ts
getLibrarySubmodule() {
  return {
    id: 'my-module',
    major: {
      id: 'my-module',           // 与 meta.major 一致
      name: '我的模块',
      icon: 'folder',
      description: '简短描述',
      order: 25                  // 侧栏排序，越小越靠前
    },
    routeName: 'library-my-module',
    buildSectionTree() {
      // 返回 PrimeVue TreeNode[]；无分类时可 return []
      return []
    },
    async ensureLoaded() {
      // 首次展开 major 时拉取数据（可选）
    },
    watchCatalogRefresh(onRefresh) {
      // 数据变化时刷新树（可选，返回 watch 的 stop）
    },
    catalogExpandsAll() {
      // 全局搜索时是否展开全部分支（可选）
      return false
    }
  }
}
```

Major 列表由 `collectLibrarySubmodules()` 聚合，**不要**手动改 `core/config/majors.ts`。

### 5. 可选：全库首页默认子模块

若希望打开 `/library` 默认进入本子模块，设置：

```ts
export const myModuleAppModule: IAppModule = {
  id: 'wanwu.library.my-module',
  libraryHomeRouteName: 'library-my-module',
  // ...
}
```

多个模块声明时，先注册者生效；通常仅 **便笺** 等明确需求时设置。

### 6. 可选：顶层路由（便笺模式）

部分子模块除 `/library/...` 外还有独立顶层路径，例如便笺 `/notes`：

```ts
getRoutes() {
  return [
    {
      path: '/notes',
      name: 'library-notes',
      component: ROUTE_OUTLET_SHELL,
      meta: { module: 'library', major: 'notes', title: '便笺' }
    }
  ]
},

getLibraryChildRoutes() {
  return [{ path: 'notes', redirect: { path: '/notes', replace: true } }]
},

belongsToLibraryPath(path) {
  return path === '/notes' || path.startsWith('/notes/')
}
```

### 7. Legacy URL 兼容

旧链接 `/library/:legacyCat/:legacySub?` 由 `library/core` 统一 redirect，子模块实现：

```ts
resolveLegacyLibraryPath(cat, sub) {
  if (cat !== 'my-module') return null
  return { name: 'library-my-module', params: { id: sub } }
}
```

图鉴另用 `resolveFallbackLegacyLibraryPath` 处理任意 `cat` 作为分类 id，见 `illustrated-handbook/app/handbookAppModule.ts`。

### 8. 设置 → 全库 分区

全库设置页（`library/core/settings/LibrarySettingsPanel.vue`）聚合各子模块贡献的分组：

```ts
registerLibrarySettingsGroup(register) {
  register({
    id: 'my-module',
    label: '我的模块',
    order: 10,
    loadPanel: () =>
      import('@modules/library/my-module/settings/MyModuleSettingsPanel.vue').then((m) => m.default)
  })
}
```

简单配置用 `WwSettingsPanel` + `fields` 配置（参考 `notes/settings/NotesSettingsPanel.vue`）；复杂 UI 再写独立 Vue 面板。

模块专属设置存 `AppSettings.moduleSettings[moduleId]`，参考 `leisure-read/domain/settings.ts`。

### 9. QuickAccess

```ts
registerQuickAccess(register) {
  register({
    kind: 'my-module',
    paletteMeta: { label: '我的模块', icon: 'folder', order: 25 },
    async open(target, ctx) {
      await ctx.pushRoute({ name: 'library-my-module' })
      await ctx.afterRouteReady()
      // 选中项、打开详情等
      return true
    }
  })
}
```

主进程搜索（命令面板统一搜索框）在 `*MainModule.ts` 实现 `searchQuickAccess` + `getQuickAccessKindLimit`，参考 `library/links/main/linksMainModule.ts`。

### 10. 主进程 + Preload

与通用模块相同，见 [`../README.md`](../README.md)：

- `main/register.ts` → `registerMainProcessModule`
- `preload/register.ts` → `registerPreloadModule`
- IPC 通道建议前缀：`<feature>:`（如 `leisureRead:fetch`）

跨模块读库 ID 时，在 `src/shared/module-bridge/moduleIds.ts` 增加常量。

### 11. 验证

```bash
npm run check:mechanisms
npm run build:app
```

删除 `src/modules/library/my-module/` 后应仍能编译；全库侧栏少一项，其余正常。

---

## 注册机制速查（全库子模块常用）

| 需求 | `IAppModule` 钩子 | 注册表 / 聚合 |
|------|-------------------|---------------|
| `/library/xxx` 路由 | `getLibraryChildRoutes()` | `collectLibraryChildRoutes()` |
| 侧栏 major + 树 | `getLibrarySubmodule()` | `collectLibrarySubmodules()` |
| 默认全库首页 | `libraryHomeRouteName` | `getLibraryHomeRouteName()` |
| 设置 → 全库 | `registerLibrarySettingsGroup` | `collectLibrarySettingsGroups()` |
| 命令面板打开 | `registerQuickAccess` | `quickAccessRendererBridge` |
| 便笺式 Outlet | `registerShellOutlet` | `shellOutletRegistry` |
| 独立 popout 启动 | `registerBootMode` | `bootModeRegistry` |
| 物品详情 | `loadItemDetailView()` | 框架 item 路由 |
| 路径是否全库 | `belongsToLibraryPath()` | `belongsToLibraryModulePath()` |

---

## 参考实现对照

| 子模块 | 复杂度 | 可参考点 |
|--------|--------|----------|
| **闲读** `leisure-read/` | 低 | 最小全库子模块：子路由 + 空树 + settings + QuickAccess + IPC |
| **链接** `links/` | 中 | `buildSectionTree` + `ensureLoaded` + `watchCatalogRefresh` + 全局搜索展开 |
| **便笺** `notes/` | 高 | 顶层 `/notes`、`registerShellOutlet`、`registerBootMode`、popout、命令贡献 |
| **图鉴** `illustrated-handbook/` | 高 | 分类树、`loadItemDetailView`、legacy fallback、独立 DB 文件 |
| **流程图** `diagrams/` | 高 | 大 IPC 面、命令执行、独立 `diagrams.sqlite` |

### 闲读：最小示例

```ts
// app/leisureReadModule.ts（节选）
export const leisureReadAppModule: IAppModule = {
  id: 'wanwu.leisure-read',

  getLibraryChildRoutes() {
    return [{
      path: 'leisure-read',
      name: 'library-leisure-read',
      component: () => import('../views/LeisureReadView.vue'),
      meta: { module: 'library', major: 'leisure-read', title: '闲读' }
    }]
  },

  getLibrarySubmodule() {
    return {
      id: 'leisure-read',
      major: { id: 'leisure-read', name: '闲读', icon: 'book-open', order: 0, description: '...' },
      routeName: 'library-leisure-read',
      buildSectionTree: () => []
    }
  }
}
```

### 链接：带分类树

```ts
getLibrarySubmodule() {
  return {
    id: 'links',
    major: { id: 'links', name: '链接', icon: 'link', order: 10, description: '...' },
    routeName: 'library-links',
    buildSectionTree() {
      const store = useLinksStore()
      return sectionTreeForMajor('links', {
        handbookCategories: [],
        linkSourceRoots: store.folders
      })
    },
    async ensureLoaded() {
      await useLinksStore().loadFolders()
    },
    watchCatalogRefresh(onRefresh) {
      const store = useLinksStore()
      return watch(() => store.folders, () => onRefresh(), { deep: true })
    }
  }
}
```

侧栏树工具：`@modules/library/core/composables/libraryCategoryTree` 的 `sectionTreeForMajor`、`handbookCatalogFromCategories`。

---

## 与 `library/core` 的关系

| 项目 | 说明 |
|------|------|
| 能否删除 `core/` | 可以；失去 `/library` Shell 与全库设置入口，子模块路由需自行挂顶层 |
| 子模块能否单独删除 | 可以；`collectLibraryChildRoutes()` 少一项，编译不受影响 |
| 能否新增 major 而不改 core | **可以**，只需 `getLibrarySubmodule()` |

---

## 反模式（全库）

| 禁止 | 应改为 |
|------|--------|
| 在 `core/config/majors.ts` 硬编码新 major | `getLibrarySubmodule().major` |
| 子路由写绝对路径 `/library/foo` | `path: 'foo'`（相对 `/library`） |
| 在 `LibraryShellView` 直接 import 子模块 | 子模块自注册 + 聚合 |
| 全库设置写进 RSS/Music 的 `registerSettingsSection` | 用 `registerLibrarySettingsGroup` |

---

## 相关文件

| 路径 | 职责 |
|------|------|
| `library/core/app/libraryAppModule.ts` | 全库 Shell、`/library` 路由 |
| `library/LibraryShellView.vue` | 全库布局 |
| `library/core/components/LibraryCategoryPanel.vue` | 侧栏分类面板 |
| `library/core/settings/LibrarySettingsPanel.vue` | 设置 → 全库 |
| `src/app/modules/librarySubmoduleTypes.ts` | `LibrarySubmoduleConfig` 类型 |
| `src/app/modules/librarySettingsGroupRegistry.ts` | 全库设置分组注册表 |

通用模块机制见 [`../README.md`](../README.md)。
