<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { renderMarkdown } from '@shared/utils/markdown'

const props = defineProps<{
  content: string
}>()

const rootRef = useTemplateRef<HTMLElement>('root')
const html = computed(() => renderMarkdown(props.content))

async function onClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const anchor = target.closest('a')
  if (!anchor || !rootRef.value?.contains(anchor)) return
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return
  event.preventDefault()
  event.stopPropagation()
  await window.wanwu.shell.openExternal(href)
}
</script>

<template>
  <div
    v-if="html"
    ref="root"
    class="ww-markdown"
    v-html="html"
    @click="onClick"
  />
</template>
