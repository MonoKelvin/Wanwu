import type { TreeNode } from 'primevue/treenode'
import type { LibraryMajorDescriptor } from '@app/modules/libraryMajorTypes'

/** 文库子模块在侧栏中的注册描述（路由、分类树、懒加载） */
export interface LibrarySubmoduleConfig {
  id: string
  major: LibraryMajorDescriptor
  routeName: string
  /** 构建该 major 的侧栏子树（模块内部自行访问 store） */
  buildSectionTree: () => TreeNode[]
  /** 首次展开 major 时懒加载数据 */
  ensureLoaded?: () => Promise<void>
  /** 数据变更时通知侧栏刷新（返回 stop 函数） */
  watchCatalogRefresh?: (onRefresh: () => void) => (() => void) | void
  /** 是否展开该 major 下全部分支（如链接全局搜索） */
  catalogExpandsAll?: () => boolean
}
