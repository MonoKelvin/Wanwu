/** 规格字段清洗、推断与 Markdown 输出 */

const PENDING = new Set(['待补充', '—', '-', '暂无', '未知', 'N/A', 'n/a'])

/** @param {string} v */
export function isValidSpecValue(v) {
  const val = String(v ?? '').trim()
  if (!val || PENDING.has(val)) return false
  if (/^待/.test(val)) return false
  return true
}

/** @param {Record<string, string>} specs */
export function pruneSpecs(specs) {
  const out = {}
  for (const [k, v] of Object.entries(specs ?? {})) {
    if (!isValidSpecValue(v)) continue
    out[k.trim()] = String(v).trim()
  }
  return out
}

/**
 * @param {Record<string, string>} specs
 * @param {string} categoryId
 */
export function inferSchemaSpecs(specs, categoryId) {
  const out = { ...specs }

  if (categoryId === 'book') {
    if (!out['作者'] && out['作 者']) out['作者'] = out['作 者']
    if (!out['体裁'] && (out['文学体裁'] || out['类 别'])) out['体裁'] = out['文学体裁'] ?? out['类 别']
    if (!out['首发年份'] && out['首版时间']) out['首发年份'] = out['首版时间']
    if (!out['首发年份'] && out['出版时间']) out['首发年份'] = out['出版时间']
    if (!out['篇幅'] && (out['中译本字数'] || out['页 数'])) out['篇幅'] = out['中译本字数'] ?? out['页 数']
    if (!out['首版出版社'] && out['出版社']) out['首版出版社'] = out['出版社']
    if (!out['ISBN'] && out['ISBN']) out['ISBN'] = out['ISBN']
  }

  if (categoryId === 'movie') {
    if (!out['导演'] && out['导 演']) out['导演'] = out['导 演']
    if (!out['主演'] && out['主 演']) out['主演'] = out['主 演']
    if (!out['上映年份'] && (out['上映时间'] || out['上映日期'])) {
      out['上映年份'] = out['上映时间'] ?? out['上映日期']
    }
    if (!out['国家/地区'] && (out['制片国家'] || out['制片国家地区'])) {
      out['国家/地区'] = out['制片国家'] ?? out['制片国家地区']
    }
  }

  if (categoryId === 'anime') {
    if (!out['制作公司'] && out['动画制作']) out['制作公司'] = out['动画制作']
    if (!out['首播/连载'] && (out['播放电视台'] || out['首播时间'])) {
      out['首播/连载'] = out['播放电视台'] ?? out['首播时间']
    }
  }

  if (categoryId === 'game') {
    if (!out['首发日期'] && out['发行日期']) out['首发日期'] = out['发行日期']
    if (!out['平台'] && out['游戏平台']) out['平台'] = out['游戏平台']
  }

  return pruneSpecs(out)
}

/**
 * @param {Record<string, string>} specs
 * @param {string[]} [priorityKeys]
 */
export function formatSpecsMarkdown(specs, priorityKeys = []) {
  const pruned = pruneSpecs(specs)
  const lines = []
  const shown = new Set()
  for (const key of priorityKeys) {
    if (pruned[key]) {
      lines.push(`- **${key}**：${pruned[key]}`)
      shown.add(key)
    }
  }
  for (const [k, v] of Object.entries(pruned)) {
    if (k === '摘要' || shown.has(k)) continue
    lines.push(`- **${k}**：${v}`)
  }
  return lines.length ? lines.join('\n') : ''
}

/** @param {string} md */
export function stripPendingSpecLines(md) {
  return md
    .replace(/^- \*\*[^*]+\*\*：待补充\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
