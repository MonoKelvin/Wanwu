import Image from '@tiptap/extension-image'
import type { NodeViewProps } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { Component } from 'vue'
import NoteImageNodeView from '@modules/library/notes/components/NoteImageNodeView.vue'
import type { NoteImageAlign } from '@modules/library/notes/lib/noteImageEditorContext'

export function createNoteImageExtension() {
  return Image.extend({
    name: 'noteImage',
    inline() {
      return true
    },
    group() {
      return 'inline'
    },
    draggable: true,
    addOptions() {
      const parent = this.parent?.()
      return {
        inline: parent?.inline ?? false,
        allowBase64: parent?.allowBase64 ?? false,
        HTMLAttributes: parent?.HTMLAttributes ?? {},
        resize: parent?.resize ?? false
      }
    },
    addAttributes() {
      return {
        ...this.parent?.(),
        imageId: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-image-id'),
          renderHTML: (attributes: Record<string, unknown>) =>
            attributes.imageId ? { 'data-image-id': String(attributes.imageId) } : {}
        },
        align: {
          default: 'left',
          parseHTML: (element: HTMLElement) => {
            const value =
              element.getAttribute('data-align') ??
              element.closest('[data-align]')?.getAttribute('data-align')
            return value === 'center' || value === 'right' ? value : 'left'
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            const align = attributes.align as NoteImageAlign | undefined
            return align && align !== 'left' ? { 'data-align': align } : {}
          }
        }
      }
    },
    addNodeView() {
      return VueNodeViewRenderer(NoteImageNodeView as Component<NodeViewProps>)
    }
  })
}

/** 仅允许 http(s) / mailto 外链，避免 javascript: 等协议 */
export function isSafeExternalHref(href: string): boolean {
  const raw = href.trim()
  if (!raw) return false
  try {
    const url = new URL(raw, 'https://local.invalid')
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
      return true
    }
    return false
  } catch {
    return false
  }
}
