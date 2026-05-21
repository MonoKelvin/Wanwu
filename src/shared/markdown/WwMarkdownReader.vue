<script setup lang="ts">
/**
 * Markdown 阅读器：渲染、排版样式、图片/表格/链接增强与交互。
 * 样式见同目录 styles/，逻辑见 composables/。
 */
defineOptions({ inheritAttrs: false })

import { computed, useAttrs, useTemplateRef } from 'vue'
import ImageViewer from '@shared/components/ImageViewer.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import { useMarkdownReader } from './composables/useMarkdownReader'
import './styles/prose.css'
import './styles/layout-detail.css'

const props = withDefaults(
  defineProps<{
    content: string
    /** 启用图片菜单、大图、外链点击（默认开启） */
    interactive?: boolean
  }>(),
  { interactive: true }
)

const attrs = useAttrs()
const contextMenuRef = useTemplateRef<InstanceType<typeof WwContextMenu>>('contextMenu')

const contentRef = computed(() => props.content)

const { html, bindRoot, onContentClick, imageMenuItems, lightboxOpen, lightboxSlides } =
  useMarkdownReader(contentRef, {
    interactive: props.interactive,
    onImageContextMenu: (event) => contextMenuRef.value?.show(event)
  })

const rootClass = computed(() => {
  const extra = attrs.class
  const extraStr =
    typeof extra === 'string' ? extra : Array.isArray(extra) ? extra.filter(Boolean).join(' ') : ''
  return ['ww-markdown', 'ww-markdown--reader', extraStr].filter(Boolean).join(' ')
})

const attrsWithoutClass = computed(() => {
  const { class: _c, ...rest } = attrs
  return rest
})

function onRootRef(el: Element | null) {
  bindRoot(el instanceof HTMLElement ? el : null)
}
</script>

<template>
  <div
    v-if="html"
    :ref="onRootRef"
    :class="rootClass"
    v-bind="attrsWithoutClass"
    v-html="html"
    @click="onContentClick"
  />
  <WwContextMenu v-if="interactive" ref="contextMenu" :model="imageMenuItems" />
  <ImageViewer
    v-if="interactive"
    v-model:open="lightboxOpen"
    :slides="lightboxSlides"
    :index="0"
  />
</template>
