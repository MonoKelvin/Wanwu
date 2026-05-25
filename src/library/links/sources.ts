/**
 * 链接来源注册表：侧栏展示与后续浏览器同步扩展点。
 * 新增浏览器时在此登记，并实现 electron/services/links 下对应 sync 提供方。
 */
export type LinkBrowserSourceId = 'edge'

export interface LinkBrowserSourceDefinition {
  id: LinkBrowserSourceId
  /** 对应 link_folders 根节点 id */
  rootFolderId: string
  name: string
  icon: string
  /** 是否支持从浏览器配置目录导入 */
  supportsImport: boolean
}

export const LINK_BROWSER_SOURCES: readonly LinkBrowserSourceDefinition[] = [
  {
    id: 'edge',
    rootFolderId: 'edge-microsoft',
    name: 'Microsoft Edge',
    icon: 'globe',
    supportsImport: true
  }
] as const

export const LOCAL_COLLECTIONS_SOURCE = {
  rootFolderId: 'local-collections',
  name: '收藏夹',
  icon: 'folder-plus'
} as const
