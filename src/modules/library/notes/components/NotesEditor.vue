<script setup lang="ts">
import WwIconButton from '@shared/components/WwIconButton.vue'
import type { NoteColor, NoteItem } from '@shared/types/notes'
import { toWanwuMediaUrl } from '@shared/utils/profileMedia'

const draftTitle = defineModel<string>('draftTitle', { required: true })
const draftContent = defineModel<string>('draftContent', { required: true })

const props = defineProps<{
  note: NoteItem
  noteColors: NoteColor[]
  colorLabels: Record<NoteColor, string>
}>()

const emit = defineEmits<{
  flush: []
  togglePinned: []
  setColor: [color: NoteColor]
  pickImage: []
  removeImage: [imageId: string]
  removeNote: []
}>()

function noteMediaUrl(relativePath: string): string | null {
  return toWanwuMediaUrl(relativePath)
}
</script>

<template>
  <section class="ww-notes-editor-wrap" aria-label="便笺编辑">
    <article class="ww-notes-editor" :class="`is-${note.color}`">
      <header class="ww-notes-editor__bar">
        <div class="ww-notes-colors" role="group" aria-label="便笺颜色">
          <button
            v-for="c in noteColors"
            :key="c"
            type="button"
            class="ww-notes-color"
            :class="[`is-${c}`, { 'is-selected': note.color === c }]"
            :aria-label="`${colorLabels[c]}${note.color === c ? '（当前）' : ''}`"
            :aria-pressed="note.color === c"
            @click="emit('setColor', c)"
          />
        </div>

        <div class="ww-notes-editor__actions">
          <WwIconButton
            icon="star"
            compact
            :class="{ 'ww-notes-icon-btn--on': note.pinned }"
            :ariaLabel="note.pinned ? '取消置顶' : '置顶'"
            v-tooltip.bottom="note.pinned ? '取消置顶' : '置顶'"
            @click="emit('togglePinned')"
          />
          <WwIconButton
            icon="image"
            compact
            ariaLabel="添加图片"
            v-tooltip.bottom="'添加图片'"
            @click="emit('pickImage')"
          />
          <WwIconButton
            icon="trash-2"
            compact
            ariaLabel="删除便笺"
            v-tooltip.bottom="'删除'"
            @click="emit('removeNote')"
          />
        </div>
      </header>

      <div class="ww-notes-editor__body">
        <input
          v-model="draftTitle"
          class="ww-notes-editor__title"
          maxlength="80"
          placeholder="标题"
          aria-label="便笺标题"
          @blur="emit('flush')"
        />
        <textarea
          v-model="draftContent"
          class="ww-notes-editor__content ww-scroll-main"
          placeholder="开始书写…"
          aria-label="便笺正文"
          @blur="emit('flush')"
        />

        <div v-if="note.images.length > 0" class="ww-notes-attachments">
          <figure
            v-for="img in note.images"
            :key="img.id"
            class="ww-notes-attach"
          >
            <img :src="noteMediaUrl(img.relativePath) ?? ''" alt="" loading="lazy" />
            <WwIconButton
              icon="x"
              compact
              class="ww-notes-attach__remove"
              ariaLabel="移除图片"
              @click="emit('removeImage', img.id)"
            />
          </figure>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.ww-notes-editor-wrap {
  min-height: 0;
  display: flex;
}

.ww-notes-editor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.875rem;
  background: var(--ww-content);
  box-shadow: var(--ww-shadow-card);
  overflow: hidden;
}

.ww-notes-editor::before {
  content: '';
  display: block;
  height: 3px;
  flex-shrink: 0;
  background: var(--ww-notes-accent, var(--ww-ink-faint));
}

.ww-notes-editor.is-yellow {
  --ww-notes-accent: #d4a72c;
}
.ww-notes-editor.is-green {
  --ww-notes-accent: #3d9a6a;
}
.ww-notes-editor.is-blue {
  --ww-notes-accent: #4a7eb8;
}
.ww-notes-editor.is-pink {
  --ww-notes-accent: #c45c7a;
}
.ww-notes-editor.is-purple {
  --ww-notes-accent: #7c6bc4;
}
.ww-notes-editor.is-gray {
  --ww-notes-accent: var(--ww-ink-faint);
}

[data-theme='dark'] .ww-notes-editor.is-yellow {
  --ww-notes-accent: #c9a227;
}
[data-theme='dark'] .ww-notes-editor.is-green {
  --ww-notes-accent: #3d9a6a;
}
[data-theme='dark'] .ww-notes-editor.is-blue {
  --ww-notes-accent: #5a8fc4;
}
[data-theme='dark'] .ww-notes-editor.is-pink {
  --ww-notes-accent: #d07088;
}
[data-theme='dark'] .ww-notes-editor.is-purple {
  --ww-notes-accent: #9a8ad4;
}

.ww-notes-editor__bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  border-bottom: 1px solid var(--ww-border-subtle);
}

.ww-notes-colors {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.ww-notes-color {
  width: 1.125rem;
  height: 1.125rem;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition:
    transform var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-notes-color:hover {
  transform: scale(1.08);
}

.ww-notes-color.is-selected {
  box-shadow: 0 0 0 2px var(--ww-content), 0 0 0 3px var(--ww-ink-muted);
}

.ww-notes-color.is-yellow {
  background: #e8c547;
}
.ww-notes-color.is-green {
  background: #5cb88a;
}
.ww-notes-color.is-blue {
  background: #6a9fd4;
}
.ww-notes-color.is-pink {
  background: #e08aa8;
}
.ww-notes-color.is-purple {
  background: #9a8ad4;
}
.ww-notes-color.is-gray {
  background: #a1a1aa;
}

[data-theme='dark'] .ww-notes-color.is-yellow {
  background: #c9a227;
}
[data-theme='dark'] .ww-notes-color.is-green {
  background: #3d9a6a;
}
[data-theme='dark'] .ww-notes-color.is-blue {
  background: #5a8fc4;
}
[data-theme='dark'] .ww-notes-color.is-pink {
  background: #d07088;
}
[data-theme='dark'] .ww-notes-color.is-purple {
  background: #8b7bc8;
}
[data-theme='dark'] .ww-notes-color.is-gray {
  background: #71717a;
}

.ww-notes-editor__actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.ww-notes-icon-btn--on {
  color: var(--ww-warn) !important;
}

.ww-notes-editor__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.625rem 0.875rem 0.875rem;
  gap: 0.5rem;
}

.ww-notes-editor__title,
.ww-notes-editor__content {
  width: 100%;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--ww-ink);
  padding: 0.375rem 0.25rem;
  outline: none;
}

.ww-notes-editor__title:focus-visible,
.ww-notes-editor__content:focus-visible {
  box-shadow: var(--ww-focus-ring);
}

.ww-notes-editor__title {
  flex-shrink: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.ww-notes-editor__title::placeholder,
.ww-notes-editor__content::placeholder {
  color: var(--ww-ink-faint);
}

.ww-notes-editor__content {
  flex: 1;
  min-height: 12rem;
  resize: none;
  font-size: 0.8125rem;
  line-height: 1.65;
}

.ww-notes-attachments {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
  gap: 0.5rem;
  padding-top: 0.25rem;
}

.ww-notes-attach {
  position: relative;
  margin: 0;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid var(--ww-border-subtle);
  background: var(--ww-inset);
}

.ww-notes-attach img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.ww-notes-attach__remove {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 1.625rem !important;
  height: 1.625rem !important;
  border-radius: 0.375rem !important;
  background: var(--ww-surface-float) !important;
  color: var(--ww-ink) !important;
  opacity: 0;
  transition: opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-notes-attach:hover .ww-notes-attach__remove,
.ww-notes-attach:focus-within .ww-notes-attach__remove {
  opacity: 1;
}
</style>
