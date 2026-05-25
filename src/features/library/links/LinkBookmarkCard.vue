<script setup lang="ts">
import WwIconButton from '@shared/components/WwIconButton.vue'
import LinkFavicon from '@features/library/links/LinkFavicon.vue'
import LinkOpenUrl from '@features/library/links/LinkOpenUrl.vue'
import WwTruncatedText from '@shared/components/WwTruncatedText.vue'
import type { LinkBookmark } from '@shared/types/links'

defineProps<{
  bookmark: LinkBookmark
  isRecycleBin: boolean
}>()

const emit = defineEmits<{
  copy: [url: string]
  open: [url: string]
  edit: [bookmark: LinkBookmark]
  restore: [bookmark: LinkBookmark]
  delete: [bookmark: LinkBookmark]
}>()
</script>

<template>
  <article
    class="ww-link-card"
    :class="{
      'ww-link-card--deleted': bookmark.deleted,
      'ww-link-card--bad': bookmark.unreachable,
      'ww-link-card--triple-actions': bookmark.deleted
    }"
  >
    <div class="ww-link-card__actions" @click.stop>
      <WwIconButton
        icon="pencil"
        compact
        icon-size="xs"
        aria-label="编辑链接"
        v-tooltip.bottom="'编辑'"
        @click="emit('edit', bookmark)"
      />
      <WwIconButton
        v-if="bookmark.deleted"
        icon="rotate-ccw"
        compact
        icon-size="xs"
        aria-label="恢复"
        v-tooltip.bottom="'恢复'"
        @click="emit('restore', bookmark)"
      />
      <WwIconButton
        icon="trash-2"
        compact
        icon-size="xs"
        :aria-label="bookmark.deleted ? '彻底删除' : '删除'"
        v-tooltip.bottom="bookmark.deleted ? '彻底删除' : '移至回收站'"
        @click="emit('delete', bookmark)"
      />
    </div>

    <div class="ww-link-card__main" @click="emit('copy', bookmark.url)">
      <LinkFavicon :key="bookmark.url" :url="bookmark.url" size="md" class="ww-link-card__favicon" />
      <div class="ww-link-card__text">
        <WwTruncatedText
          :text="bookmark.title"
          as="h3"
          class="ww-link-card__title"
        />
        <LinkOpenUrl
          :url="bookmark.url"
          show-tooltip
          class="ww-link-card__url-line"
          @open="emit('open', $event)"
        />
      </div>
    </div>
  </article>
</template>

<style>
.ww-link-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 0.625rem;
  border: 1px solid var(--ww-border-faint);
  background: var(--ww-content);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--ww-shadow-card);
  transition:
    transform var(--ww-duration) var(--ww-ease-out),
    box-shadow var(--ww-duration) var(--ww-ease-out);
}

.ww-link-card:hover {
  box-shadow: var(--ww-shadow-hover);
  transform: translateY(-3px);
}

.ww-link-card:hover :deep(.ww-link-open-url) {
  color: var(--ww-ink);
}

.ww-link-card__actions {
  position: absolute;
  top: 0.75rem;
  right: 0.5rem;
  z-index: 1;
  display: inline-flex;
  align-items: flex-start;
  gap: 0.0625rem;
  opacity: 0;
  transition: opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-link-card__actions :deep(.ww-icon-btn-plain--compact) {
  width: 1.625rem;
  height: 1.625rem;
}

.ww-link-card:hover .ww-link-card__actions,
.ww-link-card:focus-within .ww-link-card__actions {
  opacity: 1;
}

.ww-link-card__main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 5.25rem 0.75rem 0.75rem;
  text-align: left;
}

.ww-link-card--triple-actions .ww-link-card__main {
  padding-right: 7rem;
}

.ww-link-card__text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  padding-right: 0.375rem;
  text-align: left;
}

.ww-link-card .ww-truncated-text.ww-link-card__title {
  min-width: 0;
  width: 100%;
}

.ww-link-card__favicon {
  flex-shrink: 0;
  align-self: center;
}

.ww-link-card__favicon :deep(.ww-link-favicon) {
  background: transparent;
}

.ww-link-card__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ww-ink);
}

.ww-link-card__url-line.ww-link-open-url {
  margin-top: 0.25rem;
  font-size: 0.6875rem;
}

.ww-link-card--deleted {
  opacity: 0.5;
}

.ww-link-card--deleted .ww-link-card__title {
  text-decoration: line-through;
}

.ww-link-card--bad :deep(.ww-link-open-url) {
  color: var(--ww-danger, #c45c5c);
}
</style>
