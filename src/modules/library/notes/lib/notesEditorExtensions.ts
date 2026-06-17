import type { AnyExtension, Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

/** 便笺正文仅保留基础 Markdown 能力：加粗、小标题、有序/无序列表、链接、图片 */
export function createNotesEditorExtensions(options: {
  placeholder: () => string
  noteImageExtension: AnyExtension
}): Extensions {
  return [
    StarterKit.configure({
      blockquote: false,
      codeBlock: false,
      code: false,
      strike: false,
      horizontalRule: false,
      underline: false,
      italic: false,
      link: false,
      heading: {
        levels: [2, 3]
      },
      bulletList: {
        keepMarks: true,
        keepAttributes: false
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false
      }
    }),
    Placeholder.configure({
      placeholder: options.placeholder,
      emptyEditorClass: 'is-editor-empty'
    }),
    options.noteImageExtension,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      enableClickSelection: true,
      defaultProtocol: 'https',
      HTMLAttributes: {
        rel: 'noopener noreferrer'
      }
    })
  ]
}
