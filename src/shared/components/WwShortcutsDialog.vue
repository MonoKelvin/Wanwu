<script setup lang="ts">
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import type { WwShortcutSection } from '@shared/types/shortcuts'

withDefaults(
  defineProps<{
    header?: string
    sections: WwShortcutSection[]
    widthClass?: string
  }>(),
  {
    header: '快捷键',
    widthClass: 'w-[min(28rem,92vw)]'
  }
)

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <WwGlassDialog
    v-model:visible="open"
    :header="header"
    :width-class="widthClass"
    dialog-class="ww-shortcuts-dialog"
    mask-class="ww-shortcuts-mask"
    panel-blur-only
    frosted-panel
    dismissable-mask
    closable
    close-on-escape
  >
    <div class="ww-shortcuts-scroll">
      <section
        v-for="section in sections"
        :key="section.title"
        class="ww-shortcuts-section"
      >
        <h3 class="ww-shortcuts-section__title">{{ section.title }}</h3>
        <ul class="ww-shortcuts-list">
          <li
            v-for="row in section.rows"
            :key="`${section.title}-${row.keys}-${row.action}`"
            class="ww-shortcuts-list__row"
          >
            <kbd class="ww-shortcuts-list__keys">{{ row.keys }}</kbd>
            <span class="ww-shortcuts-list__action">{{ row.action }}</span>
          </li>
        </ul>
      </section>
    </div>
  </WwGlassDialog>
</template>

<style>
.ww-shortcuts-mask {
  background: rgb(18 18 22 / 0.16) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

[data-theme='dark'] .ww-shortcuts-mask {
  background: rgb(0 0 0 / 0.28) !important;
}

.ww-shortcuts-dialog .ww-glass-dialog__header {
  padding: 0.875rem 1.375rem 0.5rem !important;
  font-size: 0.9375rem !important;
}

.ww-shortcuts-dialog .ww-glass-dialog__content {
  padding: 0.25rem 1.375rem 1.25rem !important;
}

.ww-shortcuts-scroll {
  max-height: min(64vh, 30rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.125rem 0.875rem 0.125rem 0;
  margin-right: 0;
  scrollbar-gutter: stable;
}

.ww-shortcuts-scroll::-webkit-scrollbar {
  width: 5px;
}

.ww-shortcuts-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--ww-ink) 18%, transparent);
}

.ww-shortcuts-section + .ww-shortcuts-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--ww-border-subtle) 72%, transparent);
}

.ww-shortcuts-section__title {
  margin: 0 0 0.5rem;
  padding-left: 0.125rem;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ww-ink);
}

.ww-shortcuts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}

.ww-shortcuts-list__row {
  display: grid;
  grid-template-columns: minmax(9.75rem, 40%) 1fr;
  align-items: center;
  gap: 0.5rem 1.125rem;
  padding: 0.03125rem 0.25rem 0.03125rem 0.125rem;
}

.ww-shortcuts-list__keys {
  justify-self: start;
  padding: 0.25rem 0.4375rem;
  border-radius: 0.4375rem;
  border: 1px solid color-mix(in srgb, var(--ww-border-subtle) 88%, transparent);
  background: color-mix(in srgb, var(--ww-inset) 82%, transparent);
  font-family: ui-monospace, 'Cascadia Code', 'SF Mono', monospace;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--ww-ink-muted);
  text-align: left;
  white-space: nowrap;
}

.ww-shortcuts-list__action {
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
  text-align: left;
}
</style>
