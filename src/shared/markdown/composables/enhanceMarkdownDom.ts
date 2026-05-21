import { stripBlockquoteMarkerNodes } from '../utils/blockquoteMarkers'

const IMG_TOOLTIP_DELAY_MS = 300

/** 段落内容全部为斜体（em/i） */
function isAllItalicParagraph(p: HTMLParagraphElement): boolean {
  const trimmed = p.textContent?.trim() ?? ''
  if (!trimmed) return false
  if (!p.querySelector('em, i')) return false

  for (const node of [...p.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) return false
      continue
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName
      if (tag !== 'EM' && tag !== 'I') return false
    }
  }
  return true
}

function tagCaptions(root: HTMLElement) {
  root.querySelectorAll('figure.ww-md-figure').forEach((fig) => {
    let next = fig.nextElementSibling
    while (next) {
      if (next.tagName !== 'P') break
      const p = next as HTMLParagraphElement
      if (!p.textContent?.trim()) {
        next = next.nextElementSibling
        continue
      }
      if (isAllItalicParagraph(p)) {
        p.classList.add('ww-md-caption')
      }
      break
    }
  })
}

function decorateExternalLinks(root: HTMLElement) {
  root.querySelectorAll('a.ww-md-external-link').forEach((anchor) => {
    const a = anchor as HTMLAnchorElement
    if (a.querySelector('.ww-md-link-icon')) return
    const icon = document.createElement('span')
    icon.className = 'ww-md-link-icon'
    icon.setAttribute('aria-hidden', 'true')
    a.appendChild(icon)
  })
}

function createPlaceholder(kind: 'loading' | 'error') {
  const el = document.createElement('div')
  el.className = `ww-md-img-placeholder ww-md-img-placeholder--${kind}`
  el.setAttribute('aria-hidden', kind === 'loading' ? 'true' : 'false')
  if (kind === 'loading') {
    el.innerHTML = '<span class="ww-md-img-placeholder__spinner"></span><span class="ww-md-img-placeholder__label">加载中</span>'
  } else {
    el.innerHTML =
      '<span class="ww-md-img-placeholder__icon" aria-hidden="true">!</span><span class="ww-md-img-placeholder__label">图片加载失败</span>'
  }
  return el
}

/** 根据图片属性或自然尺寸，让外框与显示尺寸一致（受 --ww-md-img-max 约束） */
function presetFrameLayout(img: HTMLImageElement, frame: HTMLDivElement) {
  const attrW = Number.parseInt(img.getAttribute('width') ?? '', 10)
  const attrH = Number.parseInt(img.getAttribute('height') ?? '', 10)
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  const srcW = nw > 0 ? nw : attrW > 0 ? attrW : 0
  const srcH = nh > 0 ? nh : attrH > 0 ? attrH : 0

  frame.style.width = ''
  frame.style.height = ''
  frame.style.aspectRatio = ''

  if (srcW > 0 && srcH > 0) {
    frame.style.aspectRatio = `${srcW} / ${srcH}`
    frame.style.maxWidth = 'var(--ww-md-img-max)'
    frame.style.width = `min(var(--ww-md-img-max), ${srcW}px)`
    frame.classList.remove('ww-md-img-frame--pending')
  } else {
    frame.classList.add('ww-md-img-frame--pending')
  }
}

function clearFrameLayout(frame: HTMLDivElement) {
  frame.style.width = ''
  frame.style.height = ''
  frame.style.aspectRatio = ''
  frame.style.maxWidth = ''
  frame.classList.remove('ww-md-img-frame--pending')
}

function attachImageFrame(img: HTMLImageElement, frame: HTMLDivElement, stage: HTMLDivElement) {
  const placeholder = createPlaceholder('loading')
  frame.appendChild(placeholder)
  frame.appendChild(img)
  presetFrameLayout(img, frame)

  const src = img.getAttribute('src') ?? ''
  let tooltipTimer: ReturnType<typeof setTimeout> | null = null

  const showTooltip = () => {
    if (!src) return
    tooltipTimer = setTimeout(() => {
      stage.classList.add('ww-md-img-stage--tooltip')
    }, IMG_TOOLTIP_DELAY_MS)
  }

  const hideTooltip = () => {
    if (tooltipTimer) clearTimeout(tooltipTimer)
    tooltipTimer = null
    stage.classList.remove('ww-md-img-stage--tooltip')
  }

  stage.addEventListener('mouseenter', showTooltip)
  stage.addEventListener('mouseleave', hideTooltip)

  const onLoad = () => {
    placeholder.remove()
    clearFrameLayout(frame)
    frame.classList.add('ww-md-img-frame--loaded')
  }

  const onError = () => {
    placeholder.className = 'ww-md-img-placeholder ww-md-img-placeholder--error'
    placeholder.innerHTML =
      '<span class="ww-md-img-placeholder__icon" aria-hidden="true">!</span><span class="ww-md-img-placeholder__label">图片加载失败</span>'
    img.style.display = 'none'
    img.style.visibility = 'hidden'
    frame.classList.remove('ww-md-img-frame--loaded')
    frame.classList.remove('ww-md-img-frame--pending')
    clearFrameLayout(frame)
    frame.classList.add('ww-md-img-frame--error')
  }

  if (img.complete) {
    if (img.naturalWidth > 0) onLoad()
    else onError()
  } else {
    img.addEventListener('load', onLoad, { once: true })
    img.addEventListener('error', onError, { once: true })
  }
}

function buildFigureShell(img: HTMLImageElement) {
  const src = img.getAttribute('src') ?? ''
  const figure = document.createElement('figure')
  figure.className = 'ww-md-figure'

  const stage = document.createElement('div')
  stage.className = 'ww-md-img-stage'

  const tooltip = document.createElement('div')
  tooltip.className = 'ww-md-img-tooltip'
  tooltip.textContent = src
  tooltip.setAttribute('role', 'tooltip')

  const frame = document.createElement('div')
  frame.className = 'ww-md-img-frame'

  figure.appendChild(stage)
  stage.appendChild(tooltip)
  stage.appendChild(frame)

  attachImageFrame(img, frame, stage)
  return figure
}

function wrapImage(img: HTMLImageElement) {
  if (img.closest('.ww-md-figure')) return

  const parent = img.parentElement
  if (!parent) return

  const paragraphOnly =
    parent.tagName === 'P' &&
    [...parent.childNodes].every(
      (n) => n === img || (n.nodeType === Node.TEXT_NODE && !n.textContent?.trim())
    )

  const figure = buildFigureShell(img)

  if (paragraphOnly) {
    parent.replaceWith(figure)
  } else {
    parent.insertBefore(figure, parent.firstChild)
  }
}

function estimateTableWidth(table: HTMLTableElement, maxContainerPx: number): number {
  const rows = [...table.rows]
  if (!rows.length) return 360
  let cols = 0
  let maxCellChars = 0
  let totalChars = 0
  for (const row of rows) {
    cols = Math.max(cols, row.cells.length)
    for (const cell of row.cells) {
      const len = cell.textContent?.trim().length ?? 0
      totalChars += len
      maxCellChars = Math.max(maxCellChars, len)
    }
  }
  const cellCount = Math.max(1, rows.length * cols)
  const avg = totalChars / cellCount
  const perCol = Math.min(Math.max(avg * 12 + 52, 112), 240)
  const byContent = cols * perCol + 56
  const byLongest = maxCellChars * 12 + cols * 32
  const raw = Math.max(byContent, byLongest)
  const cap = Math.floor(maxContainerPx * 0.96)
  return Math.round(Math.min(Math.max(raw, 400), Math.max(cap, 560)))
}

function addSerialColumn(table: HTMLTableElement) {
  if (table.querySelector('.ww-md-table-idx')) return

  const headRow = table.tHead?.rows[0] ?? table.rows[0]
  if (!headRow) return

  const th = document.createElement('th')
  th.className = 'ww-md-table-idx'
  th.scope = 'col'
  th.textContent = '#'
  headRow.insertBefore(th, headRow.firstChild)

  const bodyRows: HTMLTableRowElement[] = table.tHead
    ? [...table.tBodies].flatMap((tb) => [...tb.rows])
    : [...table.rows].slice(1)

  let n = 0
  for (const row of bodyRows) {
    n += 1
    const td = document.createElement('td')
    td.className = 'ww-md-table-idx'
    td.textContent = String(n)
    row.insertBefore(td, row.firstChild)
  }
}

function wrapTable(table: HTMLTableElement, root: HTMLElement) {
  if (table.closest('.ww-md-table-wrap')) return

  const wrap = document.createElement('div')
  wrap.className = 'ww-md-table-wrap'
  const containerW = root.clientWidth || root.getBoundingClientRect().width || 640
  const width = estimateTableWidth(table, containerW)
  wrap.style.width = `${width}px`
  wrap.style.maxWidth = '96%'

  table.parentElement?.insertBefore(wrap, table)
  wrap.appendChild(table)

  addSerialColumn(table)
}

export type MarkdownImageMenuHandlers = {
  onContextMenu: (event: MouseEvent, img: HTMLImageElement) => void
}

export function enhanceMarkdownDom(
  root: HTMLElement | null | undefined,
  handlers?: MarkdownImageMenuHandlers
) {
  if (!root) return () => {}

  root.querySelectorAll('img').forEach((img) => wrapImage(img))
  tagCaptions(root)
  stripBlockquoteMarkerNodes(root)
  decorateExternalLinks(root)

  root.querySelectorAll('table').forEach((table) => wrapTable(table, root))

  const disposers: Array<() => void> = []

  if (handlers) {
    root.querySelectorAll('.ww-md-img-frame img').forEach((img) => {
      const el = img as HTMLImageElement
      const onCtx = (e: MouseEvent) => {
        e.preventDefault()
        handlers.onContextMenu(e, el)
      }
      el.addEventListener('contextmenu', onCtx)
      disposers.push(() => el.removeEventListener('contextmenu', onCtx))
    })
  }

  return () => {
    for (const d of disposers) d()
  }
}
