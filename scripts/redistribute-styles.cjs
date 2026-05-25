/**
 * 按 git HEAD main.css 将样式归位到对应 Vue 的 <style>。
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const lines = execFileSync('git', ['show', 'HEAD:src/app/styles/main.css'], {
  cwd: root,
  encoding: 'utf8'
}).split(/\r?\n/)

function slice(a, b) {
  return lines.slice(a - 1, b).join('\n')
}

function setVueStyle(rel, css) {
  const vuePath = path.join(root, 'src', rel)
  let v = fs.readFileSync(vuePath, 'utf8')
  v = v.replace(/\s*<style>[\s\S]*<\/style>\s*/g, '\n')
  v = v.trimEnd() + `\n\n<style>\n${css.trim()}\n</style>\n`
  fs.writeFileSync(vuePath, v)
}

const patches = [
  ['shared/components/WwCoverImage.vue', slice(1035, 1056)],
  [
    'features/item/UnsplashAttribution.vue',
    slice(1105, 1134)
  ],
  [
    'features/item/ItemCard.vue',
    [
      slice(941, 1028),
      slice(1057, 1064),
      slice(1084, 1104),
      slice(1136, 1188),
      `@media (prefers-reduced-motion: reduce) {
  .ww-product-card:hover { transform: none; }
  .ww-product-card:hover .ww-product-card__img { transform: none; }
}`
    ].join('\n\n')
  ],
  [
    'features/item/ItemDetailView.vue',
    [slice(1069, 1080), slice(1190, 1931), slice(2697, 2701)].join('\n\n')
  ],
  ['app/components/AppShell.vue', slice(879, 905)],
  [
    'shared/components/ImageViewer.vue',
    [slice(990, 997), slice(2394, 2821)].join('\n\n')
  ],
  ['modules/rss/RssView.vue', slice(2911, 3129)],
  [
    'features/rss/RssSidebar.vue',
    [
      slice(3131, 3133),
      slice(3044, 3068),
      slice(3300, 3456)
    ].join('\n\n')
  ],
  ['shared/components/WwCatalogTree.vue', ''], // filled below
  [
    'shared/components/WwSideNavPanel.vue',
    `/* 侧栏面板容器 */
.ww-side-nav-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.75rem;
  background: var(--ww-elevated);
  padding: 0.375rem;
  box-shadow: none;
  transition: box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-side-nav-panel:hover {
  box-shadow: var(--ww-shadow-card);
}`
  ],
  [
    'features/library/illustrated-handbook/LibraryItemList.vue',
    slice(3174, 3298)
  ],
  [
    'modules/library/illustrated-handbook/IllustratedHandbookView.vue',
    [slice(3174, 3179), slice(852, 876), slice(908, 910), `@media (prefers-reduced-motion: reduce) {
  .ww-library-grid.ww-stagger-children > * { animation: none; }
}`].join('\n\n')
  ]
]

// WwCatalogTree: use clean block from HEAD file content manually
const catalogTreeCss = `/* 目录树（全库分类 / 链接文件夹） */
.ww-catalog-tree .p-tree-node-label,
.ww-library-tree .p-tree-node-label {
  flex: 1;
  min-width: 0;
}

.ww-catalog-tree .p-tree-node-icon,
.ww-library-tree .p-tree-node-icon {
  display: none;
}

.ww-catalog-tree .p-tree-node-toggle-button,
.ww-library-tree .p-tree-node-toggle-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-inline-end: 0.125rem;
  flex-shrink: 0;
  border-radius: 0.25rem;
  color: var(--ww-ink-muted);
}

.ww-library-tree .p-tree-node-toggle-button:hover {
  color: var(--ww-ink);
  background: var(--ww-list-hover-bg);
}

.ww-catalog-tree .p-tree-node-toggle-icon,
.ww-library-tree .p-tree-node-toggle-icon {
  width: 0.75rem;
  height: 0.75rem;
}

.ww-catalog-tree .p-tree-node-content,
.ww-library-tree .p-tree-node-content {
  border-radius: 0.5rem;
  transition:
    background var(--ww-duration-fast) var(--ww-ease-out),
    color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-catalog-tree .p-tree-node-content:hover,
.ww-library-tree .p-tree-node-content:hover {
  background: var(--ww-list-hover-bg);
}

.ww-catalog-tree .p-tree-node-selected > .p-tree-node-content,
.ww-catalog-tree .p-tree-node-content.p-tree-node-selected {
  background: var(--ww-list-selected-bg) !important;
  box-shadow: none !important;
}

.ww-library-tree .p-tree-node-selected > .p-tree-node-content,
.ww-library-tree .p-tree-node-content.p-tree-node-selected {
  background: var(--ww-list-selected-bg) !important;
  color: var(--ww-ink) !important;
  box-shadow: inset 0 0 0 1px var(--ww-list-hover-ring);
}

.ww-catalog-tree--folder-nav .p-tree-node-selected > .p-tree-node-content,
.ww-catalog-tree--folder-nav .p-tree-node-content.p-tree-node-selected {
  box-shadow: none !important;
}

.ww-library-tree--majors > .p-tree-root-children > .p-tree-node > .p-tree-node-content {
  font-weight: 600;
}

.ww-catalog-tree__major-icon,
.ww-library-tree__major-icon {
  color: var(--ww-accent);
}

.ww-catalog-tree__major-text {
  font-weight: 600;
}`

const catPatch = patches.find((p) => p[0] === 'shared/components/WwCatalogTree.vue')
if (catPatch) catPatch[1] = catalogTreeCss

for (const [rel, css] of patches) {
  if (!fs.existsSync(path.join(root, 'src', rel))) {
    console.warn('skip missing', rel)
    continue
  }
  setVueStyle(rel, css)
  console.log('ok', rel)
}

// LinkBookmarkList: links list row overrides only (uses ww-library-list from LibraryItemList parent scope - won't work!)
// Vue scoped styles don't apply to child - LibraryItemList styles only apply inside LibraryItemList.vue
// LinkBookmarkList uses ww-library-list - styles must be in LibraryItemList OR LinksView :deep OR duplicate in LinkBookmarkList

// Add links bookmark list extensions to LinkBookmarkList - extract from LinksView after run
console.log('done')
