/**
 * 链接来源注册表：侧栏展示与浏览器同步扩展点。
 * 主进程浏览器探测：`src/modules/library/links/main/service/browser/registry.ts`
 * 渲染层展示定义与此处 `LINK_BROWSER_SOURCES` 对齐 id / rootFolderId。
 */
import type { BrowserBookmarkSourceId } from '@modules/library/links/domain/types'

export interface LinkBrowserSourceDefinition {
  id: BrowserBookmarkSourceId
  /** 对应 link_folders 根节点 id */
  rootFolderId: string
  name: string
  supportsImport: boolean
  /** 是否支持写回浏览器 */
  supportsWriteBack: boolean
}

/** 与 links/main/service/browser/registry 中 id、rootFolderId 保持一致 */
export const DEFAULT_BROWSER_SOURCE_ID: BrowserBookmarkSourceId = 'edge'

export const LINK_BROWSER_SOURCES: readonly LinkBrowserSourceDefinition[] = [
  {
    id: 'edge',
    rootFolderId: 'edge-microsoft',
    name: 'Microsoft Edge',
    supportsImport: true,
    supportsWriteBack: true
  },
  {
    id: 'chrome',
    rootFolderId: 'chrome-google',
    name: 'Google Chrome',
    supportsImport: true,
    supportsWriteBack: true
  },
  {
    id: 'firefox',
    rootFolderId: 'firefox-mozilla',
    name: 'Mozilla Firefox',
    supportsImport: true,
    supportsWriteBack: false
  },
  {
    id: 'safari',
    rootFolderId: 'safari-apple',
    name: 'Safari',
    supportsImport: true,
    supportsWriteBack: false
  },
  {
    id: 'opera',
    rootFolderId: 'opera-stable',
    name: 'Opera',
    supportsImport: true,
    supportsWriteBack: true
  }
] as const

export const BROWSER_ROOT_FOLDER_IDS = new Set(
  LINK_BROWSER_SOURCES.map((s) => s.rootFolderId)
)

export function isBrowserRootFolderId(folderId: string): boolean {
  return BROWSER_ROOT_FOLDER_IDS.has(folderId)
}

export function browserSourceForRootFolderId(
  folderId: string
): LinkBrowserSourceDefinition | undefined {
  return LINK_BROWSER_SOURCES.find((s) => s.rootFolderId === folderId)
}

export function browserSourceForFolderSource(
  source: string
): LinkBrowserSourceDefinition | undefined {
  return LINK_BROWSER_SOURCES.find((s) => s.id === source)
}

/** 进入链接模块、路由无 folderId 时的默认目录 */
export function defaultLinksEntryFolderId(): string {
  return (
    browserSourceForFolderSource(DEFAULT_BROWSER_SOURCE_ID)?.rootFolderId ??
    LINK_BROWSER_SOURCES[0]?.rootFolderId ??
    'edge-microsoft'
  )
}

export const LOCAL_COLLECTIONS_SOURCE = {
  rootFolderId: 'local-collections',
  name: '收藏夹',
  icon: 'folder-plus'
} as const
