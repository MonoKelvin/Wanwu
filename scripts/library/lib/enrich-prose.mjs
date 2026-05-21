/** 将抓取结果整理为详情区 Markdown（不含规格参数） */

const SPEC_SECTION_RE = /##\s*规格参数[\s\S]*?(?=\n## |\n---|\n>|$)/i

/**
 * @param {string} md
 */
export function stripSpecSectionFromMarkdown(md) {
  return (md ?? '')
    .replace(SPEC_SECTION_RE, '')
    .replace(/^- \*\*[^*]+\*\*：待补充\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * @param {string} text
 */
function cleanInline(text) {
  return (text ?? '')
    .replace(/\[\d+[\s\-]*\d*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} body
 * @returns {Array<{ heading: string, text: string }>}
 */
function splitSections(body) {
  const chunks = body.split(/\n{2,}/)
  /** @type {Array<{ heading: string, text: string }>} */
  const out = []
  let current = { heading: '', text: '' }

  for (const raw of chunks) {
    const block = raw.trim()
    if (!block || block.startsWith('>') || block === '---') continue
    const h2 = block.match(/^##\s+(.+)$/)
    if (h2 && block.length < 80) {
      if (current.text.trim()) out.push({ ...current, text: cleanInline(current.text) })
      current = { heading: h2[1].trim(), text: '' }
      continue
    }
    const plain = cleanInline(block.replace(/^##\s+.+$/gm, ''))
    if (plain.length < 40) continue
    if (current.heading && !current.text) current.text = plain
    else if (current.text) current.text += `\n\n${plain}`
    else current = { heading: '', text: plain }
  }
  if (current.text.trim()) out.push({ ...current, text: cleanInline(current.text) })
  return out
}

/**
 * @param {string} text
 * @param {number} maxLen
 */
function excerpt(text, maxLen = 520) {
  const t = cleanInline(text)
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen)}…`
}

/**
 * @param {object} item
 * @param {{ markdown?: string, source?: string }|null} ref
 * @param {{ sections: Array<{ heading: string, paragraphs: string[], source: string }> }} sup
 */
export function composeArticleMarkdown(item, ref, sup) {
  const lines = []
  const name = item.name
  let body = stripSpecSectionFromMarkdown(ref?.markdown ?? '')
  body = body.replace(/^#\s+.+\n+/m, '').trim()

  const sections = splitSections(body)
  const overview = sections.find((s) => !s.heading || /概述|简介|summary/i.test(s.heading))?.text ?? sections[0]?.text

  lines.push('## 概述', '')
  if (overview) {
    lines.push(`> **要点**：${excerpt(overview, 200)}`, '', overview, '')
  } else if (item.summary) {
    lines.push(cleanInline(item.summary), '')
  } else {
    lines.push(`${name} 条目百科整理。`, '')
  }

  const used = new Set([overview])
  const bodySections = sections.filter((s) => s.text && !used.has(s.text))
  const labels = ['背景与发展', '特点与细节', '影响与延伸', '补充说明']
  const bucketSize = Math.max(1, Math.ceil(bodySections.length / labels.length))

  for (let i = 0; i < labels.length; i++) {
    const slice = bodySections.slice(i * bucketSize, (i + 1) * bucketSize)
    if (!slice.length) continue
    lines.push(`## ${labels[i]}`, '')
    for (const sec of slice) {
      const title = sec.heading && !/概述|简介/.test(sec.heading) ? sec.heading : ''
      if (title) lines.push(`### ${title}`, '')
      const paras = sec.text.split(/\n\n+/).filter((p) => p.length > 30)
      for (const p of paras.slice(0, 4)) {
        lines.push(p, '')
      }
    }
  }

  if (sup?.sections?.length) {
    lines.push('## 延伸阅读', '')
    for (const sec of sup.sections) {
      lines.push(`### ${sec.heading}`, '')
      for (const p of sec.paragraphs.slice(0, 3)) {
        lines.push(p, '')
      }
      if (sec.source) lines.push(`> 参考：${sec.source}`, '')
    }
  }

  const cites = [...(body.match(/^>.*来源：.*$/gm) ?? [])]
  if (ref?.markdown?.includes('来源：') && !cites.length) {
    const m = ref.markdown.match(/^>.*来源：.*$/m)
    if (m) cites.push(m[0])
  }

  if (cites.length) {
    lines.push('---', '', '## 资料来源', '')
    for (const c of cites) {
      lines.push(c.replace(/^>\s?/, '> '), '')
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * @param {string} description
 */
export function descriptionHasInlineSpecs(description) {
  return /##\s*规格参数/i.test(description ?? '')
}
