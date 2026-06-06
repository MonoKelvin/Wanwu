/** Wanwu 通用文档压缩包格式 */

export const WANWU_DOCUMENT_PACKAGE_FORMAT = 'wanwu-document-package' as const
export const WANWU_DOCUMENT_PACKAGE_VERSION = 1

export const MANIFEST_ENTRY_PATH = 'manifest.json'

/** 流程图单文件扩展名 */
export const WFG_FILE_EXTENSION = '.wfg'

/** 通用文档包扩展名 */
export const WWPKG_FILE_EXTENSION = '.wwpkg'

export const MIME_JSON = 'application/json'
export const MIME_OCTET = 'application/octet-stream'

/** 流程图包内路径约定 */
export const WFG_PATHS = {
  meta: 'content/meta.json',
  page: (pageId: string) => `content/pages/${pageId}.json`,
  asset: (assetId: string, ext: string) => `assets/${assetId}.${ext}`
} as const
