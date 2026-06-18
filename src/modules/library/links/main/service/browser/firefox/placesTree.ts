import { openSqliteSnapshot } from '../sqliteSession'

export type FirefoxBookmarkRow = {
  id: number
  parent: number
  position: number
  type: number
  title: string
  url: string | null
  placeGuid: string | null
}

export type FirefoxBookmarkNode = {
  name: string
  type: 'url' | 'folder'
  url?: string
  guid?: string
  bookmarkId: number
  children?: FirefoxBookmarkNode[]
}

const MOZ_TYPE_BOOKMARK = 1
const MOZ_TYPE_FOLDER = 2

export function readFirefoxBookmarkRows(placesPath: string): FirefoxBookmarkRow[] {
  const { db, cleanup } = openSqliteSnapshot(placesPath, { journalModeOff: true })
  try {
    return db
      .prepare(
        `SELECT b.id, b.parent, b.position, b.type,
                COALESCE(b.title, '') AS title,
                p.url, p.guid AS placeGuid
         FROM moz_bookmarks b
         LEFT JOIN moz_places p ON b.fk = p.id
         ORDER BY b.parent ASC, b.position ASC`
      )
      .all() as FirefoxBookmarkRow[]
  } finally {
    cleanup()
  }
}

function rowsToMap(rows: FirefoxBookmarkRow[]): Map<number, FirefoxBookmarkRow> {
  return new Map(rows.map((r) => [r.id, r]))
}

function buildChildren(
  parentId: number,
  rows: FirefoxBookmarkRow[],
  byParent: Map<number, FirefoxBookmarkRow[]>
): FirefoxBookmarkNode[] {
  const kids = byParent.get(parentId) ?? []
  const nodes: FirefoxBookmarkNode[] = []

  for (const row of kids) {
    if (row.type === MOZ_TYPE_FOLDER) {
      nodes.push({
        name: row.title || '文件夹',
        type: 'folder',
        bookmarkId: row.id,
        children: buildChildren(row.id, rows, byParent)
      })
    } else if (row.type === MOZ_TYPE_BOOKMARK && row.url) {
      nodes.push({
        name: row.title || row.url,
        type: 'url',
        url: row.url,
        guid: row.placeGuid ?? undefined,
        bookmarkId: row.id
      })
    }
  }

  return nodes
}

/** 从 Firefox「书签工具栏」导出树；若无则取 places 根下第一个文件夹 */
export function firefoxToolbarTree(placesPath: string): FirefoxBookmarkNode | null {
  const rows = readFirefoxBookmarkRows(placesPath)
  if (!rows.length) return null

  const byParent = new Map<number, FirefoxBookmarkRow[]>()
  for (const row of rows) {
    const list = byParent.get(row.parent) ?? []
    list.push(row)
    byParent.set(row.parent, list)
  }

  const toolbar = rows.find(
    (r) => r.type === MOZ_TYPE_FOLDER && r.parent === 1 && r.title === 'toolbar'
  )
  const rootFolder = toolbar ?? rows.find((r) => r.type === MOZ_TYPE_FOLDER && r.parent === 1)
  if (!rootFolder) return null

  return {
    name: rootFolder.title || '书签',
    type: 'folder',
    bookmarkId: rootFolder.id,
    children: buildChildren(rootFolder.id, rows, byParent)
  }
}
