import type { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router'
import type { TreeNode } from 'primevue/treenode'
import type { LibraryMajorDescriptor } from '@app/modules/libraryMajorTypes'
import type { WwMenuItem } from '@shared/types/menu'

/** 文库侧栏目录树导航扩展（各子模块自行注册，避免 core 硬编码业务路由） */
export interface LibraryCatalogHooks {
  /** 目录树节点 key 前缀，如 `pa:`、`dg:` */
  treeKeyPrefix: string
  folderIdFromTreeKey(key: string): string | null
  resolveRouteFromTreeKey(key: string): RouteLocationRaw | null
  selectionFromRoute(route: RouteLocationNormalizedLoaded): Record<string, boolean> | null
  readPersistedSelection(): Record<string, boolean>
  writePersistedSelection(keys: Record<string, boolean>): void
  defaultExpandedKeys?(): Record<string, boolean>
  catalogNodeBadge?(node: TreeNode): number | undefined
  /** 目录树节点右键菜单（返回 null 表示不处理该 key） */
  getCatalogContextMenuItems?(key: string): WwMenuItem[] | null
}

/** 文库子模块在侧栏中的注册描述（路由、分类树、懒加载） */
export interface LibrarySubmoduleConfig {
  id: string
  major: LibraryMajorDescriptor
  routeName: string
  /** 构建该 major 的侧栏子树（模块内部自行访问 store） */
  buildSectionTree: () => TreeNode[]
  /** 侧栏目录选择与路由同步（可选，未提供时仅支持 major 级跳转） */
  catalog?: LibraryCatalogHooks
  /** 首次展开 major 时懒加载数据 */
  ensureLoaded?: () => Promise<void>
  /** 数据变更时通知侧栏刷新（返回 stop 函数） */
  watchCatalogRefresh?: (onRefresh: () => void) => (() => void) | void
  /** 是否展开该 major 下全部分支（如链接全局搜索） */
  catalogExpandsAll?: () => boolean
}
