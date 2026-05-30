import type { InjectionKey } from 'vue'

export type NoteImageAlign = 'left' | 'center' | 'right'

export type NoteImageMenuTarget = {
  imageId: string
  src: string
  align: NoteImageAlign
  updateAlign: (align: NoteImageAlign) => void
  remove: () => void
}

export type NoteImageEditorContext = {
  openViewer: (imageId?: string, src?: string) => void
  openImageMenu: (payload: { event: MouseEvent; target: NoteImageMenuTarget }) => void
}

export const NOTE_IMAGE_EDITOR_KEY: InjectionKey<NoteImageEditorContext> = Symbol('noteImageEditor')
