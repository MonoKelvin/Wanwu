import type { TreeNode } from 'primevue/treenode'
import type { Category } from '@modules/library/illustrated-handbook/domain/itemTypes'
import type { DiagramFolder } from '@modules/library/diagrams/domain/types'
import type { LinkBookmark, LinkFolder } from '@modules/library/links/domain/types'

/** 图鉴 store 在文库侧栏中暴露的最小能力面 */
export interface LibraryHandbookStoreSlice {
  categories: Category[]
  loadCategories(): Promise<void>
}

/** 链接 store 在文库侧栏中暴露的最小能力面 */
export interface LibraryLinksStoreSlice {
  folders: LinkFolder[]
  isGlobalSearch: boolean
  globalSearchMatches: LinkBookmark[]
  loadFolders(): Promise<void>
}

/** 流程图 store 在文库侧栏中暴露的最小能力面 */
export interface LibraryDiagramsStoreSlice {
  folders: DiagramFolder[]
  loadFolders(): Promise<void>
  refreshRecycleCount(): Promise<void>
}

/**
 * 文库子模块侧栏树构建上下文。
 * 仅依赖各 store 的能力切片，避免 app 层耦合具体 Pinia 实现。
 */
export interface LibrarySubmoduleContext {
  handbookStore: LibraryHandbookStoreSlice
  linksStore: LibraryLinksStoreSlice
  diagramsStore: LibraryDiagramsStoreSlice
}

/** 文库子模块在侧栏中的注册描述（路由、分类树、懒加载） */
export interface LibrarySubmoduleConfig {
  id: string
  routeName: string
  buildSectionTree: (ctx: LibrarySubmoduleContext) => TreeNode[]
  ensureLoaded?: (ctx: LibrarySubmoduleContext) => Promise<void>
}
