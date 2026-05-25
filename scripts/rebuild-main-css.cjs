/**
 * 从 git HEAD 的 main.css 重建 app/styles/main.css，并修补关键 Vue 内联样式。
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const lines = execFileSync('git', ['show', 'HEAD:src/app/styles/main.css'], {
  cwd: root,
  encoding: 'utf8'
}).split(/\r?\n/)

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n')
}

function setVueStyle(rel, css) {
  const vuePath = path.join(root, 'src', rel)
  let v = fs.readFileSync(vuePath, 'utf8')
  v = v.replace(/<style>[\s\S]*<\/style>\s*/g, '')
  v = v.trimEnd() + `\n\n<style>\n${css.trim()}\n</style>\n`
  fs.writeFileSync(vuePath, v)
}

function buildMain() {
  const remove = new Set()
  const ranges = [
    [432, 828],
    [829, 2125],
    [2270, 3459],
    [72, 96] // confirm-dialog、bg-editor → App.vue / PersonalView
  ]
  for (const [a, b] of ranges) {
    for (let i = a; i <= b; i++) remove.add(i)
  }
  const kept = []
  for (let i = 1; i <= lines.length; i++) {
    if (!remove.has(i)) kept.push(lines[i - 1])
  }
  const header = `/** 全局：Tailwind、Prime 覆盖、毛玻璃工具类。业务 UI 见各 Vue <style>。 */\n`
  return header + kept.join('\n') + '\n'
}

// PageHeader：页头 + 标题排列（原 global 拆分时补充）
const pageHeaderCss = [
  slice(436, 454),
  `.ww-page-header__titles-inline {
  display: flex;
  flex-wrap: nowrap;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.ww-page-header__titles-inline h1 {
  flex-shrink: 0;
  margin: 0;
  white-space: nowrap;
}

.ww-page-header__titles-inline .ww-subtitle {
  flex: 1 1 auto;
  margin-top: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-page-header__titles-stacked {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  flex-shrink: 0;
  width: max-content;
  max-width: min(42vw, 20rem);
}

.ww-page-header__titles-stacked h1,
.ww-page-header__titles-stacked .ww-subtitle {
  margin: 0;
  width: 100%;
  text-align: left;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  word-break: break-word;
}

.ww-page-header__titles-stacked .ww-subtitle {
  line-height: 1.35;
}`
].join('\n\n')

setVueStyle('app/components/PageHeader.vue', pageHeaderCss)
setVueStyle('app/components/AppShell.vue', slice(432, 434))
setVueStyle('shared/components/WwContextMenu.vue', slice(2270, 2342))

// Links 工具栏修饰（原 links.css 片段，HEAD 无则保留最小集）
const linksToolbarExtra = `
.ww-page-toolbar--links {
  flex-wrap: nowrap;
  gap: 0.375rem;
}

.ww-page-toolbar__search--links {
  width: min(100%, 14rem);
  min-width: 8.5rem;
}

.ww-page-toolbar__cluster--nowrap {
  flex-wrap: nowrap;
}
`
const linksToolbarPath = path.join(root, 'src/features/library/links/LinksToolbar.vue')
let lt = fs.readFileSync(linksToolbarPath, 'utf8')
if (!lt.includes('ww-page-toolbar--links')) {
  lt = lt.replace(/<\/style>\s*$/, `${linksToolbarExtra}\n</style>\n`)
  fs.writeFileSync(linksToolbarPath, lt)
}

fs.writeFileSync(path.join(root, 'src/app/styles/main.css'), buildMain())
console.log('rebuilt main.css and patched PageHeader, AppShell, WwContextMenu')
