export type NoteColor =
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'purple'
  | 'gray'
  | 'orange'
  | 'teal'
  | 'red'

export interface NoteImage {
  id: string
  noteId: string
  relativePath: string
  createdAt: string
}

export interface NoteItem {
  id: string
  title: string
  content: string
  color: NoteColor
  pinned: boolean
  createdAt: string
  updatedAt: string
  images: NoteImage[]
}

export interface NoteCreateInput {
  title?: string
  content?: string
  color?: NoteColor
  pinned?: boolean
}

export interface NoteUpdateInput {
  id: string
  title?: string
  content?: string
  color?: NoteColor
  pinned?: boolean
}
