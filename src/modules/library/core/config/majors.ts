/** 全库顶级大分类（侧栏树第一层） */
export const LIBRARY_MAJORS = [
  {
    id: 'notes',
    name: '便笺',
    icon: 'pencil',
    description: '文本与图片便笺'
  },
  {
    id: 'links',
    name: '链接',
    icon: 'link',
    description: '浏览器收藏与网址'
  },
  {
    id: 'illustrated-handbook',
    name: '图鉴',
    icon: 'book-open',
    description: '图鉴条目与分类'
  }
] as const

export type LibraryMajorId = (typeof LIBRARY_MAJORS)[number]['id']

export function isLibraryMajorId(value: string): value is LibraryMajorId {
  return LIBRARY_MAJORS.some((m) => m.id === value)
}

export function libraryMajorById(id: string) {
  return LIBRARY_MAJORS.find((m) => m.id === id)
}
