<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed, inject } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { useCursorTooltip } from '@shared/composables/useCursorTooltip'
import {
  NOTE_IMAGE_EDITOR_KEY,
  type NoteImageAlign
} from '@modules/library/notes/lib/noteImageEditorContext'

const props = defineProps(nodeViewProps)

const editorCtx = inject(NOTE_IMAGE_EDITOR_KEY)

const imageId = computed(() => String(props.node.attrs.imageId ?? ''))
const src = computed(() => String(props.node.attrs.src ?? ''))
const align = computed((): NoteImageAlign => {
  const value = props.node.attrs.align
  return value === 'center' || value === 'right' ? value : 'left'
})

const wrapperClass = computed(() => [
  'ww-note-image-node',
  align.value !== 'left' ? `is-align-${align.value}` : null
])

const tooltip = useCursorTooltip('双击查看大图')

function placeCursorAfterImage() {
  const pos = props.getPos()
  if (typeof pos !== 'number') return
  const after = pos + props.node.nodeSize
  props.editor.chain().focus().setTextSelection(after).run()
}

function onImageClick(event: MouseEvent) {
  if (event.detail >= 2) return
  event.preventDefault()
  event.stopPropagation()
  placeCursorAfterImage()
}

function onImageDblClick(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  editorCtx?.openViewer(imageId.value || undefined, src.value || undefined)
}

/** 经编辑器 history 删除，支持 Ctrl+Z 撤销 */
function removeImageNode() {
  const pos = props.getPos()
  if (typeof pos !== 'number') {
    props.deleteNode()
    return
  }
  props.editor
    .chain()
    .focus()
    .deleteRange({ from: pos, to: pos + props.node.nodeSize })
    .run()
}

function onRemove(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  removeImageNode()
}

function onContextMenu(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  editorCtx?.openImageMenu({
    event,
    target: {
      imageId: imageId.value,
      src: src.value,
      align: align.value,
      updateAlign: (next) => props.updateAttributes({ align: next }),
      remove: () => removeImageNode()
    }
  })
}
</script>

<template>
  <NodeViewWrapper
    :class="wrapperClass"
    :data-image-id="imageId"
    :data-align="align"
    data-drag-handle
  >
    <img
      :src="src"
      alt=""
      draggable="false"
      @click="onImageClick"
      @dblclick="onImageDblClick"
      @contextmenu="onContextMenu"
      @mouseenter="tooltip.onMouseEnter"
      @mousemove="tooltip.onMouseMove"
      @mouseleave="tooltip.onMouseLeave"
    />
    <button
      type="button"
      class="ww-note-image-node__remove"
      aria-label="移除图片"
      @mousedown.prevent
      @click="onRemove"
    >
      <WwIcon name="x" :size="12" />
    </button>
  </NodeViewWrapper>

  <Teleport to="body">
    <div
      v-if="tooltip.visible"
      class="ww-cursor-tooltip"
      role="tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      {{ tooltip.message }}
    </div>
  </Teleport>
</template>

<style>
.ww-cursor-tooltip {
  position: fixed;
  z-index: 10060;
  max-width: min(20rem, calc(100vw - 1rem));
  padding: 0.35rem 0.6rem;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--ww-ink);
  white-space: nowrap;
  pointer-events: none;
  border-radius: 0.375rem;
  border: 1px solid var(--ww-border-subtle);
  background: var(--ww-surface-float);
  box-shadow: var(--ww-shadow-card);
}

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .ww-cursor-tooltip {
    backdrop-filter: blur(12px) saturate(1.25);
    -webkit-backdrop-filter: blur(12px) saturate(1.25);
  }
}
</style>
