<script setup lang="ts">
import WwIconButton from '@shared/components/WwIconButton.vue'
import LinkFavicon from '@features/library/links/LinkFavicon.vue'
import LinkOpenUrl from '@features/library/links/LinkOpenUrl.vue'
import WwTruncatedText from '@shared/components/WwTruncatedText.vue'
import type { LinkBookmark } from '@shared/types/links'

defineProps<{
  bookmarks: LinkBookmark[]
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
  <ul class="ww-library-list ww-links-bookmark-list" role="list">
    <li v-for="link in bookmarks" :key="link.id" role="listitem">
      <div
        class="ww-links-bookmark-list__row"
        :class="{
          'ww-links-bookmark-list__row--deleted': link.deleted,
          'ww-links-bookmark-list__row--bad': link.unreachable
        }"
        @click="emit('copy', link.url)"
      >
        <LinkFavicon :key="link.url" :url="link.url" size="sm" class="ww-links-bookmark-list__favicon" />

        <div class="ww-links-bookmark-list__text">
          <WwTruncatedText
            :text="link.title"
            as="span"
            class="ww-links-bookmark-list__title"
          />
          <LinkOpenUrl
            :url="link.url"
            show-tooltip
            class="ww-links-bookmark-list__url-line"
            @open="emit('open', $event)"
          />
        </div>

        <div class="ww-links-bookmark-list__actions" @click.stop>
          <WwIconButton
            icon="pencil"
            compact
            aria-label="编辑"
            v-tooltip.bottom="'编辑'"
            @click="emit('edit', link)"
          />
          <WwIconButton
            v-if="link.deleted"
            icon="rotate-ccw"
            compact
            aria-label="恢复"
            v-tooltip.bottom="'恢复'"
            @click="emit('restore', link)"
          />
          <WwIconButton
            icon="trash-2"
            compact
            aria-label="删除"
            v-tooltip.bottom="link.deleted ? '彻底删除' : '删除'"
            @click="emit('delete', link)"
          />
        </div>
      </div>
    </li>
  </ul>
</template>

<style>
.ww-library-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ww-links-bookmark-list {
  text-align: left;
}

.ww-links-bookmark-list__row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  padding: 0.625rem 0.75rem;
  border-radius: 0.625rem;
  background: var(--ww-content);
  border: 1px solid var(--ww-border-faint);
  box-shadow: var(--ww-shadow-card);
  transition:
    box-shadow var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out);
}

.ww-links-bookmark-list__row:hover {
  box-shadow: var(--ww-shadow-hover);
  transform: translateY(-2px);
}

.ww-links-bookmark-list__row:hover :deep(.ww-link-open-url) {
  color: var(--ww-ink);
}

.ww-links-bookmark-list__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  text-align: left;
}

.ww-links-bookmark-list__title {
  width: 100%;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ww-ink);
}

.ww-links-bookmark-list__favicon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  align-self: center;
}

.ww-links-bookmark-list__favicon :deep(.ww-link-favicon) {
  background: transparent;
}

.ww-links-bookmark-list__actions {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  align-items: center;
  align-self: center;
  gap: 0.0625rem;
}

.ww-links-bookmark-list__row--deleted {
  opacity: 0.5;
}

.ww-links-bookmark-list__row--deleted .ww-links-bookmark-list__title {
  text-decoration: line-through;
}

.ww-links-bookmark-list__row--bad :deep(.ww-link-open-url) {
  color: var(--ww-danger, #c45c5c);
}
</style>
