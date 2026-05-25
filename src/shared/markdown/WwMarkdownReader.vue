<script setup lang="ts">
/**
 * Markdown 阅读器：渲染、排版样式、图片/表格/链接增强与交互。
 * 样式见同目录 styles/，逻辑见 composables/。
 */
defineOptions({ inheritAttrs: false })

import { computed, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue'
import ImageViewer from '@shared/components/ImageViewer.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import { useMarkdownReader } from './composables/useMarkdownReader'

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

function onRootRef(el: Element | ComponentPublicInstance | null) {
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
<style>
/**
 * Markdown 阅读样式 — 高级简约，仅 .ww-markdown--reader
 */

:root {
  --ww-md-size: 0.875rem;
  --ww-md-leading: 1.68;
  --ww-md-gap: 0.625rem;
  --ww-md-gap-lg: 1.125rem;
  --ww-md-radius: 0.5rem;
  --ww-md-radius-lg: 0.625rem;
  --ww-md-max-line: 42rem;

  /* 链接：高级灰 + 淡蓝灰马卡龙，避免纯黑/纯白 */
  --ww-md-link: #6e7588;
  --ww-md-link-hover: #5a6f94;
  --ww-md-link-active: #4a5f7a;
  --ww-md-link-underline: rgb(90 111 148 / 0.32);
  --ww-md-link-underline-ease: cubic-bezier(0.22, 1, 0.36, 1);

  /*
   * 引用块 hover：只比 inset 略深一点（约 10% 列表 hover 色），勿用完整 --ww-list-hover-bg
   * 浅色 #f5f5f6 → ~#f1f1f3；列表 hover #ececee 反差过大易显「亮/跳」
   */
  --ww-md-quote-bg: var(--ww-inset);
  --ww-md-quote-bg-hover: color-mix(in srgb, var(--ww-inset) 86%, var(--ww-list-hover-bg) 14%);
  /* 表格行底色在 elevated 上，略混 list-hover，勿用整段列表 hover 色 */
  --ww-md-table-row-bg-hover: color-mix(in srgb, var(--ww-elevated) 68%, var(--ww-list-hover-bg) 32%);

  --ww-md-callout-tip: #3d7a5c;
  --ww-md-callout-note: #4a7eb8;
  --ww-md-callout-info: #5a6a8a;
  --ww-md-callout-warning: #9a7b2e;
  --ww-md-callout-danger: #b85c5c;
  --ww-md-callout-example: #6a5a9a;
  --ww-md-callout-quote: var(--ww-ink-faint);

  --ww-md-callout-bg: var(--ww-inset);
  --ww-md-callout-border: var(--ww-border-subtle);
  --ww-md-img-max: min(86%, 26rem);
  --ww-md-img-shadow: 0 8px 22px -10px rgb(18 18 22 / 0.12), 0 2px 6px -2px rgb(18 18 22 / 0.06);
  --ww-md-img-shadow-hover: 0 16px 36px -12px rgb(18 18 22 / 0.16), 0 4px 12px -4px rgb(18 18 22 / 0.08);
}

[data-theme='dark'] {
  --ww-md-link: #9aa3b4;
  --ww-md-link-hover: #b4c5d8;
  --ww-md-link-active: #8fa3bd;
  --ww-md-link-underline: rgb(180 197 216 / 0.38);

  /* 深色 inset 很暗，列表 hover 提亮明显，混合比例再压低 */
  --ww-md-quote-bg: var(--ww-inset);
  --ww-md-quote-bg-hover: color-mix(in srgb, var(--ww-inset) 94%, var(--ww-list-hover-bg) 6%);
  --ww-md-table-row-bg-hover: color-mix(in srgb, var(--ww-elevated) 78%, var(--ww-list-hover-bg) 22%);

  --ww-md-img-shadow: 0 10px 28px -10px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(255 255 255 / 0.05);
  --ww-md-img-shadow-hover: 0 18px 40px -12px rgb(0 0 0 / 0.55), 0 0 0 1px rgb(255 255 255 / 0.08);
}

@keyframes ww-md-reveal {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* —— 阅读容器 —— */
.ww-markdown--reader {
  position: relative;
  width: 100%;
  max-width: var(--ww-md-max-line);
  font-size: var(--ww-md-size);
  line-height: var(--ww-md-leading);
  color: var(--ww-ink-muted);
  font-weight: 400;
  letter-spacing: 0.01em;
  word-wrap: break-word;
  overflow-wrap: break-word;
  -webkit-font-smoothing: antialiased;
}

.ww-markdown--reader::before {
  content: '';
  position: absolute;
  inset: -0.5rem -0.75rem;
  pointer-events: none;
  border-radius: var(--ww-md-radius-lg);
  background-image: radial-gradient(circle, var(--ww-grid-dot) 1px, transparent 1px);
  background-size: var(--ww-grid-size) var(--ww-grid-size);
  mask-image: linear-gradient(180deg, black 0%, transparent 90%);
  opacity: 0.38;
  z-index: 0;
}

.ww-markdown--reader > * {
  position: relative;
  z-index: 0;
}

.ww-markdown--reader > :first-child {
  margin-top: 0;
}

.ww-markdown--reader > :last-child {
  margin-bottom: 0;
}

/* —— 段落（正文左对齐，不受图片块影响） —— */
.ww-markdown--reader p {
  margin: 0 0 var(--ww-md-gap);
  text-align: left;
}

.ww-markdown--reader p:last-child {
  margin-bottom: 0;
}

/* —— 标题 —— */
.ww-markdown--reader h1 {
  margin: 1.5rem 0 var(--ww-md-gap-lg);
  padding-bottom: 0.5rem;
  font-size: 1.3125rem;
  font-weight: 650;
  line-height: 1.32;
  letter-spacing: -0.02em;
  color: var(--ww-ink);
  border-bottom: 1px solid var(--ww-border-subtle);
}

.ww-markdown--reader > h1:first-child {
  margin-top: 0;
}

.ww-markdown--reader h2 {
  position: relative;
  margin: 1.75rem 0 0.5rem;
  padding-left: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.015em;
  color: var(--ww-ink);
  border-left: none;
}

.ww-markdown--reader h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.12em;
  bottom: 0.12em;
  width: 3px;
  border-radius: 999px;
  background: var(--ww-list-selected-accent);
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-markdown--reader h2:hover::before {
  background: var(--ww-ink-faint);
}

.ww-markdown--reader h3 {
  margin: 1.375rem 0 0.375rem;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--ww-ink);
}

.ww-markdown--reader h4 {
  margin: 1.125rem 0 0.3rem;
  font-size: var(--ww-md-size);
  font-weight: 600;
  line-height: 1.4;
  color: var(--ww-ink-muted);
}

.ww-markdown--reader h5,
.ww-markdown--reader h6 {
  margin: 0.875rem 0 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ww-ink-faint);
}

/* —— 强调 —— */
.ww-markdown--reader strong {
  font-weight: 600;
  color: var(--ww-ink);
}

.ww-markdown--reader em {
  font-style: italic;
  color: var(--ww-ink-muted);
}

.ww-markdown--reader del {
  opacity: 0.5;
  text-decoration: line-through;
}

/* —— 链接 —— */
.ww-markdown--reader a,
.ww-markdown--reader a.ww-md-external-link {
  display: inline;
  color: var(--ww-md-link);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  background-image: linear-gradient(var(--ww-md-link-underline), var(--ww-md-link-underline));
  background-repeat: no-repeat;
  background-size: 0% 1px;
  background-position: 0 100%;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background-size 0.28s var(--ww-md-link-underline-ease);
}

.ww-markdown--reader a:hover,
.ww-markdown--reader a.ww-md-external-link:hover {
  color: var(--ww-md-link-hover);
  background-size: 100% 1px;
}

.ww-markdown--reader a:active,
.ww-markdown--reader a.ww-md-external-link:active {
  color: var(--ww-md-link-active);
}

.ww-markdown--reader a.ww-md-external-link .ww-md-link-icon {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  margin-left: 0.2em;
  vertical-align: -0.05em;
  opacity: 0.55;
  background-color: currentColor;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 3h6v6'/%3E%3Cpath d='M10 14 21 3'/%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/%3E%3C/svg%3E");
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 3h6v6'/%3E%3Cpath d='M10 14 21 3'/%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  transition: opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-markdown--reader a.ww-md-external-link:hover .ww-md-link-icon {
  opacity: 0.85;
}

/* —— 列表 —— */
.ww-markdown--reader ul,
.ww-markdown--reader ol {
  margin: 0 0 var(--ww-md-gap);
  padding-left: 1.25rem;
}

.ww-markdown--reader li {
  margin: 0.2rem 0;
  padding-left: 0.125rem;
  transition: color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-markdown--reader li::marker {
  color: var(--ww-ink-faint);
}

.ww-markdown--reader li:hover {
  color: var(--ww-ink);
}

.ww-markdown--reader ul ul,
.ww-markdown--reader ol ol,
.ww-markdown--reader ul ol,
.ww-markdown--reader ol ul {
  margin-top: 0.2rem;
  margin-bottom: 0;
}

.ww-markdown--reader li > p {
  margin: 0.15rem 0;
}

/* —— 引用块 —— */
.ww-markdown--reader blockquote {
  margin: 0 0 var(--ww-md-gap);
  padding: 0.5rem 0.875rem 0.5rem 0.875rem;
  border: 1px solid var(--ww-border-faint);
  border-left: 3px solid var(--ww-list-selected-bg);
  border-radius: var(--ww-md-radius);
  background: var(--ww-md-quote-bg);
  color: var(--ww-ink-muted);
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

@media (hover: hover) {
  .ww-markdown--reader blockquote:hover,
  .ww-markdown--reader blockquote:focus-within {
    background: var(--ww-md-quote-bg-hover);
  }
}

.ww-markdown--reader blockquote p {
  margin: 0.2rem 0;
}

/* —— Callout —— */
.ww-markdown--reader .ww-md-callout {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 0.25rem 0.625rem;
  margin: 0 0 var(--ww-md-gap);
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--ww-md-callout-border);
  border-left-width: 3px;
  border-radius: var(--ww-md-radius);
  background: var(--ww-md-callout-bg);
  color: var(--ww-ink-muted);
  animation: ww-md-reveal 0.38s var(--ww-ease-out) both;
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

@media (hover: hover) {
  .ww-markdown--reader .ww-md-callout:hover,
  .ww-markdown--reader .ww-md-callout:focus-within {
    background: var(--ww-md-quote-bg-hover);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ww-markdown--reader .ww-md-callout {
    animation: none;
  }
}

.ww-markdown--reader .ww-md-callout__badge {
  grid-row: 1 / span 2;
  align-self: start;
  margin-top: 0.08rem;
  padding: 0.125rem 0.4rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.35;
  border-radius: 0.25rem;
  background: var(--ww-tag-bg);
  color: var(--ww-ink-faint);
}

.ww-markdown--reader .ww-md-callout__title {
  grid-column: 2;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ww-ink);
}

.ww-markdown--reader .ww-md-callout__body {
  grid-column: 2;
  font-size: inherit;
  line-height: inherit;
}

.ww-markdown--reader .ww-md-callout__body > :first-child {
  margin-top: 0;
}

.ww-markdown--reader .ww-md-callout__body > :last-child {
  margin-bottom: 0;
}

.ww-markdown--reader .ww-md-callout--tip {
  border-left-color: var(--ww-md-callout-tip);
}
.ww-markdown--reader .ww-md-callout--tip .ww-md-callout__badge {
  color: var(--ww-md-callout-tip);
}

.ww-markdown--reader .ww-md-callout--note {
  border-left-color: var(--ww-md-callout-note);
}
.ww-markdown--reader .ww-md-callout--note .ww-md-callout__badge {
  color: var(--ww-md-callout-note);
}

.ww-markdown--reader .ww-md-callout--info {
  border-left-color: var(--ww-md-callout-info);
}
.ww-markdown--reader .ww-md-callout--info .ww-md-callout__badge {
  color: var(--ww-md-callout-info);
}

.ww-markdown--reader .ww-md-callout--warning,
.ww-markdown--reader .ww-md-callout--warn {
  border-left-color: var(--ww-md-callout-warning);
}
.ww-markdown--reader .ww-md-callout--warning .ww-md-callout__badge,
.ww-markdown--reader .ww-md-callout--warn .ww-md-callout__badge {
  color: var(--ww-md-callout-warning);
}

.ww-markdown--reader .ww-md-callout--danger,
.ww-markdown--reader .ww-md-callout--error {
  border-left-color: var(--ww-md-callout-danger);
}
.ww-markdown--reader .ww-md-callout--danger .ww-md-callout__badge,
.ww-markdown--reader .ww-md-callout--error .ww-md-callout__badge {
  color: var(--ww-md-callout-danger);
}

.ww-markdown--reader .ww-md-callout--example {
  border-left-color: var(--ww-md-callout-example);
}
.ww-markdown--reader .ww-md-callout--example .ww-md-callout__badge {
  color: var(--ww-md-callout-example);
}

.ww-markdown--reader .ww-md-callout--quote {
  border-left-color: var(--ww-md-callout-quote);
  font-style: italic;
}

/* —— 代码 —— */
.ww-markdown--reader code {
  font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace;
  font-size: 0.88em;
  padding: 0.06em 0.32em;
  border-radius: 0.3rem;
  border: 1px solid var(--ww-border-faint);
  background: var(--ww-inset);
  color: var(--ww-ink);
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-markdown--reader code:hover {
  background: var(--ww-list-hover-bg);
}

.ww-markdown--reader pre {
  position: relative;
  margin: 0 0 var(--ww-md-gap);
  padding: 0.75rem 0.875rem;
  overflow-x: auto;
  border: 1px solid var(--ww-border-subtle);
  border-radius: var(--ww-md-radius);
  background: var(--ww-inset);
  font-size: 0.78rem;
  line-height: 1.55;
  transition:
    border-color var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-markdown--reader pre:hover {
  border-color: var(--ww-border-subtle);
  box-shadow: var(--ww-shadow-card);
}

.ww-markdown--reader pre::before {
  content: '';
  position: absolute;
  top: 0.5rem;
  left: 0.75rem;
  width: 2.25rem;
  height: 0.4rem;
  border-radius: 999px;
  background:
    radial-gradient(circle at 0.22rem 50%, #e06b6b 0.18rem, transparent 0.19rem),
    radial-gradient(circle at 0.72rem 50%, #d4a84a 0.18rem, transparent 0.19rem),
    radial-gradient(circle at 1.22rem 50%, #5cb87a 0.18rem, transparent 0.19rem);
  opacity: 0.65;
  pointer-events: none;
}

[data-theme='dark'] .ww-markdown--reader pre::before {
  opacity: 0.45;
}

.ww-markdown--reader pre code {
  display: block;
  padding: 1rem 0 0;
  border: none;
  background: transparent;
  font-size: inherit;
  color: var(--ww-ink-muted);
}

.ww-markdown--reader pre code:hover {
  background: transparent;
}

/* —— 分隔线 —— */
.ww-markdown--reader hr {
  margin: 1.125rem 0;
  border: none;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--ww-border-subtle) 20%,
    var(--ww-border-subtle) 80%,
    transparent 100%
  );
}

/* —— 表格（居中、圆角、自适应宽度、序号列） —— */
.ww-markdown--reader .ww-md-table-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
  margin: 0 auto var(--ww-md-gap-lg);
}

.ww-markdown--reader .ww-md-table-wrap table {
  width: 100%;
  margin: 0;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--ww-elevated);
  box-shadow: none;
  transition: box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-markdown--reader .ww-md-table-wrap:hover table {
  box-shadow: var(--ww-shadow-card);
}

.ww-markdown--reader .ww-md-table-wrap thead {
  background: var(--ww-inset);
}

.ww-markdown--reader .ww-md-table-wrap th,
.ww-markdown--reader .ww-md-table-wrap td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--ww-border-faint);
  text-align: left;
  vertical-align: top;
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

@media (hover: hover) {
  .ww-markdown--reader .ww-md-table-wrap tbody tr:hover td {
    background: var(--ww-md-table-row-bg-hover);
  }
}

.ww-markdown--reader .ww-md-table-wrap tr:last-child th,
.ww-markdown--reader .ww-md-table-wrap tr:last-child td {
  border-bottom: none;
}

.ww-markdown--reader .ww-md-table-wrap th {
  font-weight: 700;
  color: var(--ww-ink);
}

.ww-markdown--reader .ww-md-table-wrap td {
  color: var(--ww-ink-muted);
}

.ww-markdown--reader .ww-md-table-wrap .ww-md-table-idx {
  width: 2.25rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
  background: var(--ww-inset);
}

.ww-markdown--reader .ww-md-table-wrap thead .ww-md-table-idx {
  color: var(--ww-ink-muted);
}

/* —— 图片区块 —— */
.ww-markdown--reader .ww-md-figure {
  display: flex;
  justify-content: center;
  margin: 1rem 0 0.25rem;
  padding: 0;
  border: none;
}

.ww-markdown--reader .ww-md-img-stage {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
}

.ww-markdown--reader .ww-md-img-tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.5rem);
  z-index: 2;
  width: max-content;
  max-width: 80vw;
  padding: 0.35rem 0.6rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--ww-ink);
  text-align: center;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  pointer-events: none;
  border-radius: 0.375rem;
  border: 1px solid var(--ww-border-subtle);
  background: var(--ww-surface-float);
  box-shadow: var(--ww-shadow-card);
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
  transition:
    opacity var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-markdown--reader .ww-md-img-stage--tooltip .ww-md-img-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.ww-markdown--reader .ww-md-img-frame {
  position: relative;
  display: inline-block;
  width: fit-content;
  max-width: var(--ww-md-img-max);
  vertical-align: top;
  line-height: 0;
  border-radius: var(--ww-md-radius-lg);
  border: 1px solid var(--ww-border-faint);
  background: var(--ww-inset);
  overflow: hidden;
  cursor: zoom-in;
  transition:
    transform var(--ww-duration) var(--ww-ease-out),
    box-shadow var(--ww-duration) var(--ww-ease-out),
    border-color var(--ww-duration-fast) var(--ww-ease-out);
}

/* 加载中尚无尺寸：保留可显示占位区的最小区域 */
.ww-markdown--reader .ww-md-img-frame--pending:not(.ww-md-img-frame--error) {
  min-width: min(10rem, 72vw);
  min-height: 6rem;
}

.ww-markdown--reader .ww-md-img-frame--loaded {
  background: transparent;
}

.ww-markdown--reader .ww-md-img-frame--error {
  cursor: default;
  min-width: min(12rem, 80vw);
  min-height: 7.5rem;
  background: var(--ww-inset);
}

.ww-markdown--reader .ww-md-img-frame--error img {
  display: none;
}

@media (prefers-reduced-motion: no-preference) {
  .ww-markdown--reader .ww-md-img-frame--loaded:hover {
    transform: translateY(-2px) scale(1.012);
    box-shadow: var(--ww-md-img-shadow-hover);
    border-color: var(--ww-border-subtle);
  }
}

.ww-markdown--reader .ww-md-img-frame img {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  margin: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
  visibility: visible;
}

.ww-markdown--reader .ww-md-img-placeholder {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--ww-inset);
  color: var(--ww-ink-faint);
}

.ww-markdown--reader .ww-md-img-placeholder__spinner {
  width: 1.375rem;
  height: 1.375rem;
  border: 2px solid var(--ww-border-subtle);
  border-top-color: var(--ww-ink-faint);
  border-radius: 50%;
  animation: ww-md-img-spin 0.75s linear infinite;
}

@keyframes ww-md-img-spin {
  to {
    transform: rotate(360deg);
  }
}

.ww-markdown--reader .ww-md-img-placeholder__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
  color: var(--ww-ink-muted);
  background: var(--ww-tag-bg);
}

.ww-markdown--reader .ww-md-img-placeholder--error {
  gap: 1rem;
}

.ww-markdown--reader .ww-md-img-placeholder__label {
  font-size: 0.75rem;
  line-height: 1.4;
}

/* 图注：图片下方整段斜体居中 */
.ww-markdown--reader p.ww-md-caption {
  margin: 0.25rem 0 var(--ww-md-gap-lg);
  padding: 0 0.75rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--ww-ink-faint);
  text-align: center !important;
}

.ww-markdown--reader p.ww-md-caption em,
.ww-markdown--reader p.ww-md-caption i {
  font-style: normal;
}

/* —— 任务列表 —— */
.ww-markdown--reader input[type='checkbox'] {
  margin-right: 0.375rem;
  accent-color: var(--ww-list-selected-accent);
}

.ww-markdown--reader li:has(> input[type='checkbox']) {
  list-style: none;
  margin-left: -1.25rem;
  padding-left: 0;
}
</style>
<style>
/**
 * 物品详情「详细介绍」区域内的 Markdown 布局约束
 * 与 WwMarkdownReader 搭配，父级使用 .ww-product-detail__desc
 */

.ww-product-detail__desc .ww-markdown--reader {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
}

.ww-product-detail__desc .ww-markdown--reader pre {
  max-width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
}

.ww-product-detail__desc .ww-markdown--reader .ww-md-table-wrap {
  max-width: 100%;
}

.ww-product-detail__desc .ww-markdown--reader .ww-md-table-wrap table {
  table-layout: fixed;
}

.ww-product-detail__desc .ww-markdown--reader .ww-md-table-wrap th,
.ww-product-detail__desc .ww-markdown--reader .ww-md-table-wrap td {
  word-break: break-word;
  overflow-wrap: break-word;
}
</style>
