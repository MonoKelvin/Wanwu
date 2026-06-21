/** 逆地理编码结果 → 侧栏展示用的 area / city 标签 */
import { isDistrictLike, isProvinceLevel } from '@modules/weather/domain/placeLabel'

export interface GeocodeHit {
  name: string
  admin1?: string
  admin2?: string
  admin3?: string
  admin4?: string
}

/** 优先区/县级地名（章贡区、南山区等） */
export function pickAreaLabel(hit: GeocodeHit): string {
  const districtLike = [hit.admin4, hit.admin3, hit.name, hit.admin2].filter(Boolean) as string[]
  for (const raw of districtLike) {
    const t = raw.trim()
    if (isDistrictLike(t)) return t
  }
  const fallbackCandidates = [hit.name, hit.admin2, hit.admin1].filter(Boolean) as string[]
  for (const raw of fallbackCandidates) {
    const t = raw.trim()
    if (t && !isProvinceLevel(t)) return t
  }
  return hit.admin1?.trim() || '未知'
}

export function pickCityLabel(hit: GeocodeHit): string | undefined {
  const admin2 = hit.admin2?.trim()
  const admin1 = hit.admin1?.trim()
  const city = admin2 || (admin1 && !isProvinceLevel(admin1) ? admin1 : undefined)
  if (!city) return undefined
  const area = pickAreaLabel(hit)
  return city === area ? undefined : city
}
