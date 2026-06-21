/** 是否为区/县级及以下地名 */
export function isDistrictLike(name: string): boolean {
  return /[区县旗]|街道|镇|乡|村|社区/.test(name.trim())
}

/** 是否为省级行政区 */
export function isProvinceLevel(name: string): boolean {
  return /(特别行政区|自治区|省)$/.test(name.trim())
}

/** 侧栏展示：「赣州市·章贡区」；不含省级；仅有单级时返回该级 */
export function formatWeatherPlaceLabel(area: string, city?: string): string {
  let district = area.trim()
  let prefecture = city?.trim()

  if (isProvinceLevel(district)) {
    district = prefecture || ''
    prefecture = undefined
  }
  if (prefecture && isProvinceLevel(prefecture)) {
    prefecture = undefined
  }
  if (!district && prefecture) return prefecture
  if (prefecture && prefecture !== district) return `${prefecture}·${district}`
  return district
}

/** 在「市·区」连接处拆成两行（若有） */
export function splitPlaceLabelLines(label: string): string[] {
  const trimmed = label.trim()
  if (!trimmed) return ['']
  const dotIndex = trimmed.indexOf('·')
  if (dotIndex <= 0 || dotIndex >= trimmed.length - 1) return [trimmed]
  const head = trimmed.slice(0, dotIndex).trim()
  const tail = trimmed.slice(dotIndex + 1).trim()
  if (!head || !tail) return [trimmed]
  return [head, tail]
}
