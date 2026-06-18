/** 流程图 .wfg 文档包内路径约定（业务层，非通用格式） */

export const DIAGRAM_WFG_FILE_EXTENSION = '.wfg'

export const DIAGRAM_PACKAGE_PATHS = {
  meta: 'content/meta.json',
  page: (pageId: string) => `content/pages/${pageId}.json`,
  asset: (assetId: string, ext: string) => `assets/${assetId}.${ext}`
} as const
