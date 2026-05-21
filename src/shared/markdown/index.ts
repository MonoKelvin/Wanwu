/**
 * Markdown 阅读模块
 *
 * - WwMarkdownReader：带样式与交互的阅读组件
 * - renderMarkdown：仅 HTML 字符串（导出、预览等）
 * - enhanceMarkdownDom：对已有 DOM 做图片/表格等增强
 */

export { default as WwMarkdownReader } from './WwMarkdownReader.vue'

export { renderMarkdown } from './utils/renderMarkdown'
export { resolveImageViewerUrl } from './utils/imageViewerUrl'
export { cleanBlockquoteInnerHtml, stripBlockquoteMarkerNodes } from './utils/blockquoteMarkers'

export { enhanceMarkdownDom } from './composables/enhanceMarkdownDom'
export type { MarkdownImageMenuHandlers } from './composables/enhanceMarkdownDom'
export { useMarkdownReader } from './composables/useMarkdownReader'
export type { UseMarkdownReaderOptions } from './composables/useMarkdownReader'
