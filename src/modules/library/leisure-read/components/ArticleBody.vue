<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { stripHtml } from '@modules/library/leisure-read/domain/types'
import type { LeisureReadSnippetRange } from '@modules/library/leisure-read/domain/types'
import {
  mergeSnippetRanges,
  rangesOverlap,
  renderTextWithRanges,
  splitParagraphOffsets,
  subtractRangeFromRanges
} from '@modules/library/leisure-read/domain/snippetRanges'
import { usePopTip } from '@shared/composables/usePopTip'
import WwIcon from '@shared/components/WwIcon.vue'

export interface ArticleSnippetPayload {
  text: string
  start: number
  end: number
}

const props = defineProps<{
  html?: string
  plain: string
  title?: string
  initialHighlightRanges?: LeisureReadSnippetRange[]
}>()

const emit = defineEmits<{
  favoriteSnippet: [payload: ArticleSnippetPayload]
  removeSnippet: [payload: ArticleSnippetPayload]
}>()

type ToolbarPhase = 'hidden' | 'entering' | 'shown' | 'moving' | 'leaving'

interface ToolbarState {
  top: number
  left: number
  text: string
  below: boolean
  start: number
  end: number
}

const popTip = usePopTip()
const scrollRef = ref<HTMLElement | null>(null)
const toolbar = ref<ToolbarState | null>(null)
const toolbarPhase = ref<ToolbarPhase>('hidden')
const scrollEdges = ref({ atTop: true, atBottom: false })
const highlightRanges = ref<LeisureReadSnippetRange[]>([])

let scrollRaf = 0
let phaseTimer: ReturnType<typeof setTimeout> | null = null

const displayText = computed(() => {
  if (props.html) return stripHtml(props.html)
  return props.plain
})

watch(
  () => props.initialHighlightRanges,
  (value) => {
    highlightRanges.value = value?.length ? mergeSnippetRanges(value) : []
    if (value?.length) {
      void nextTick(() => scrollToFirstHighlight())
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => props.plain,
  () => {
    if (!props.initialHighlightRanges?.length) {
      highlightRanges.value = []
    }
  }
)

const paragraphBlocks = computed(() => splitParagraphOffsets(displayText.value))

const toolbarCanRemoveHighlight = computed(() => {
  if (!toolbar.value) return false
  const { start, end } = toolbar.value
  return rangesOverlap(highlightRanges.value, start, end)
})

function getOffsetInElement(root: HTMLElement, targetNode: Node, targetOffset: number): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node === targetNode) return offset + targetOffset
    offset += node.textContent?.length ?? 0
  }
  return -1
}

function getGlobalTextOffset(targetNode: Node, targetOffset: number): number {
  const root = scrollRef.value
  if (!root) return -1

  const paras = root.querySelectorAll<HTMLElement>('.lr-article__para')
  const blocks = paragraphBlocks.value

  for (let i = 0; i < paras.length; i++) {
    const el = paras[i]
    const block = blocks[i]
    if (!block || (!el.contains(targetNode) && el !== targetNode)) continue

    const local = getOffsetInElement(el, targetNode, targetOffset)
    if (local >= 0) return block.start + local
  }
  return -1
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderParagraph(text: string, sliceStart: number) {
  if (highlightRanges.value.length) {
    return renderTextWithRanges(text, sliceStart, highlightRanges.value)
  }
  return escapeHtml(text)
}

function scrollToFirstHighlight() {
  const mark = scrollRef.value?.querySelector('.lr-article__mark')
  mark?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function clearPhaseTimer() {
  if (phaseTimer) {
    clearTimeout(phaseTimer)
    phaseTimer = null
  }
}

function updateScrollEdges() {
  const el = scrollRef.value
  if (!el) return
  const threshold = 6
  scrollEdges.value = {
    atTop: el.scrollTop <= threshold,
    atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
  }
}

function hideToolbar() {
  if (!toolbar.value || toolbarPhase.value === 'leaving') return
  toolbarPhase.value = 'leaving'
  clearPhaseTimer()
  phaseTimer = setTimeout(() => {
    toolbar.value = null
    toolbarPhase.value = 'hidden'
  }, 220)
}

function showToolbar(state: ToolbarState) {
  const wasVisible =
    toolbar.value !== null && toolbarPhase.value !== 'leaving' && toolbarPhase.value !== 'hidden'

  toolbar.value = state

  if (wasVisible) {
    toolbarPhase.value = 'moving'
    clearPhaseTimer()
    phaseTimer = setTimeout(() => {
      if (toolbarPhase.value === 'moving') toolbarPhase.value = 'shown'
    }, 180)
    return
  }

  toolbarPhase.value = 'entering'
  clearPhaseTimer()
  phaseTimer = setTimeout(() => {
    if (toolbarPhase.value === 'entering') toolbarPhase.value = 'shown'
  }, 320)
}

function readToolbarState(): ToolbarState | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !scrollRef.value) return null

  const range = sel.rangeCount ? sel.getRangeAt(0) : null
  if (!range || !scrollRef.value.contains(range.commonAncestorContainer)) return null

  const start = getGlobalTextOffset(range.startContainer, range.startOffset)
  const end = getGlobalTextOffset(range.endContainer, range.endOffset)
  if (start < 0 || end <= start) return null

  const raw = displayText.value.slice(start, end)
  const lead = raw.length - raw.trimStart().length
  const trail = raw.length - raw.trimEnd().length
  const text = raw.trim()
  if (!text) return null

  let trimStart = start + lead
  let trimEnd = end - trail

  const rect = range.getBoundingClientRect()
  const host = scrollRef.value.getBoundingClientRect()
  const toolbarH = 34
  const gap = 6
  const spaceAbove = rect.top - host.top
  const below = spaceAbove < toolbarH + gap + 4

  let left = rect.left + rect.width / 2
  const edge = 40
  left = Math.max(edge, Math.min(left, window.innerWidth - edge))

  return {
    text,
    start: trimStart,
    end: trimEnd,
    top: below ? rect.bottom : rect.top,
    left,
    below
  }
}

function updateToolbar() {
  const next = readToolbarState()
  if (!next) {
    hideToolbar()
    return
  }
  showToolbar(next)
}

function onScroll() {
  updateScrollEdges()
  if (!toolbar.value) return
  cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    const next = readToolbarState()
    if (!next) {
      hideToolbar()
      return
    }
    toolbar.value = next
  })
}

async function copySnippet() {
  if (!toolbar.value) return
  await popTip.copyText(toolbar.value.text, '已复制片段')
  hideToolbar()
  window.getSelection()?.removeAllRanges()
}

function favoriteSnippet() {
  if (!toolbar.value) return
  const { text, start, end } = toolbar.value
  highlightRanges.value = mergeSnippetRanges([
    ...highlightRanges.value,
    { start, end, text }
  ])
  emit('favoriteSnippet', { text, start, end })
  popTip.show('片段已加入收藏')
  hideToolbar()
  window.getSelection()?.removeAllRanges()
}

function removeHighlightSnippet() {
  if (!toolbar.value) return
  const { text, start, end } = toolbar.value
  highlightRanges.value = subtractRangeFromRanges(
    highlightRanges.value,
    displayText.value,
    start,
    end
  )
  emit('removeSnippet', { text, start, end })
  popTip.show('已取消片段收藏')
  hideToolbar()
  window.getSelection()?.removeAllRanges()
}

function showToolbarForMark(mark: HTMLElement, clientX: number, clientY: number) {
  const start = Number(mark.dataset.rangeStart)
  const end = Number(mark.dataset.rangeEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return

  const text = displayText.value.slice(start, end).trim()
  if (!text) return

  const rect = mark.getBoundingClientRect()
  const host = scrollRef.value?.getBoundingClientRect()
  const toolbarH = 34
  const gap = 6
  const spaceAbove = host ? rect.top - host.top : rect.top
  const below = spaceAbove < toolbarH + gap + 4
  const edge = 40
  const left = Math.max(edge, Math.min(clientX, window.innerWidth - edge))

  showToolbar({
    text,
    start,
    end,
    top: below ? rect.bottom : rect.top,
    left,
    below
  })
}

function onArticleContextMenu(e: MouseEvent) {
  const mark = (e.target as HTMLElement).closest('mark.lr-article__mark') as HTMLElement | null
  if (!mark || !scrollRef.value?.contains(mark)) return

  e.preventDefault()
  showToolbarForMark(mark, e.clientX, e.clientY)
}

function onSelectionChange() {
  if (!scrollRef.value) return

  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) {
    hideToolbar()
    return
  }

  const range = sel.rangeCount ? sel.getRangeAt(0) : null
  if (!range || !scrollRef.value.contains(range.commonAncestorContainer)) {
    hideToolbar()
    return
  }

  const next = readToolbarState()
  if (!next) {
    hideToolbar()
    return
  }

  if (toolbar.value) toolbar.value = next
  else showToolbar(next)
}

function onArticleMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.lr-article__toolbar')) return
  requestAnimationFrame(() => onSelectionChange())
}

function onDocMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.lr-article__toolbar')) return
  if (!scrollRef.value?.contains(target)) hideToolbar()
}

watch(paragraphBlocks, () => {
  requestAnimationFrame(updateScrollEdges)
})

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('selectionchange', onSelectionChange)
  requestAnimationFrame(updateScrollEdges)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('selectionchange', onSelectionChange)
  cancelAnimationFrame(scrollRaf)
  clearPhaseTimer()
})
</script>

<template>
  <div class="lr-article-wrap">
    <p v-if="title" class="lr-article__title">{{ title }}</p>
    <div
      class="lr-article__scroll-wrap"
      :class="{
        'is-at-top': scrollEdges.atTop,
        'is-at-bottom': scrollEdges.atBottom
      }"
    >
      <div
        ref="scrollRef"
        class="lr-article__scroll"
        @mousedown="onArticleMouseDown"
        @mouseup="updateToolbar"
        @contextmenu="onArticleContextMenu"
        @scroll="onScroll"
      >
        <p
          v-for="(block, i) in paragraphBlocks"
          :key="i"
          class="lr-article__para"
          v-html="renderParagraph(block.para, block.start)"
        />
      </div>
      <div class="lr-article__edge lr-article__edge--top" aria-hidden="true" />
      <div class="lr-article__edge lr-article__edge--bottom" aria-hidden="true" />
    </div>
    <Teleport to="body">
      <div
        v-if="toolbar"
        class="lr-article__toolbar-host"
        :class="[`is-${toolbarPhase}`, { 'is-below': toolbar.below }]"
        :style="{ top: `${toolbar.top}px`, left: `${toolbar.left}px` }"
        @mousedown.prevent
      >
        <div class="lr-article__toolbar">
          <button
            type="button"
            class="lr-article__toolbar-btn"
            v-tooltip.bottom="'复制'"
            aria-label="复制"
            @click="copySnippet"
          >
            <WwIcon name="copy" size="xs" />
          </button>
          <button
            v-if="toolbarCanRemoveHighlight"
            type="button"
            class="lr-article__toolbar-btn lr-article__toolbar-btn--remove"
            v-tooltip.bottom="'取消片段收藏'"
            aria-label="取消片段收藏"
            @click="removeHighlightSnippet"
          >
            <WwIcon name="star" size="xs" :filled="true" />
          </button>
          <button
            v-else
            type="button"
            class="lr-article__toolbar-btn"
            v-tooltip.bottom="'收藏片段'"
            aria-label="收藏片段"
            @click="favoriteSnippet"
          >
            <WwIcon name="star" size="xs" />
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
