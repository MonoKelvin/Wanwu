/** WMO 天气码 + 昼夜 / 中文摘要 → 图标与文案 */
import {
  weatherIconId,
  type WeatherIconId,
  type WeatherIconSlug
} from '@modules/weather/domain/weatherIconIds'

export interface WeatherPresentation {
  summary: string
  icon: WeatherIconId
}

function dayNight(day: WeatherIconSlug, night: WeatherIconSlug, isDay: boolean): WeatherIconId {
  return weatherIconId(isDay ? day : night)
}

function icon(slug: WeatherIconSlug): WeatherIconId {
  return weatherIconId(slug)
}

/** WMO weather code + 昼夜 → 中文摘要与图标 */
export function resolveWeatherPresentation(code: number, isDay: boolean): WeatherPresentation {
  if (code === 0) {
    return { summary: '晴', icon: dayNight('sun', 'sun-night', isDay) }
  }
  if (code === 1) {
    return { summary: '少云', icon: dayNight('few-clouds', 'few-clouds-night', isDay) }
  }
  if (code === 2) {
    return { summary: '多云', icon: dayNight('partly-cloudy', 'partly-cloudy-night', isDay) }
  }
  if (code === 3) {
    return { summary: '阴', icon: icon('overcast') }
  }
  if (code === 45) {
    return { summary: '雾', icon: icon('fog') }
  }
  if (code === 48) {
    return { summary: '雾凇', icon: icon('fog-dense') }
  }
  if (code >= 51 && code <= 55) {
    return { summary: '毛毛雨', icon: icon('drizzle') }
  }
  if (code === 56 || code === 57) {
    return { summary: '冻毛毛雨', icon: icon('freezing-rain') }
  }
  if (code === 61) {
    return { summary: '小雨', icon: icon('rain-light') }
  }
  if (code === 63) {
    return { summary: '中雨', icon: icon('rain-medium') }
  }
  if (code === 65) {
    return { summary: '大雨', icon: icon('rain-heavy') }
  }
  if (code === 66 || code === 67) {
    return { summary: '冻雨', icon: icon('freezing-rain') }
  }
  if (code === 71) {
    return { summary: '小雪', icon: icon('snow-light') }
  }
  if (code === 73) {
    return { summary: '中雪', icon: icon('snow-medium') }
  }
  if (code === 75) {
    return { summary: '大雪', icon: icon('snow-heavy') }
  }
  if (code === 77) {
    return { summary: '雪粒', icon: icon('snow') }
  }
  if (code === 80) {
    return { summary: '阵雨', icon: dayNight('shower', 'shower-night', isDay) }
  }
  if (code === 81) {
    return { summary: '中阵雨', icon: dayNight('shower-heavy', 'shower-heavy-night', isDay) }
  }
  if (code === 82) {
    return { summary: '大阵雨', icon: icon('rain-storm') }
  }
  if (code === 85) {
    return { summary: '阵雪', icon: dayNight('snow-shower', 'snow-shower-night', isDay) }
  }
  if (code === 86) {
    return { summary: '大阵雪', icon: icon('snow-storm') }
  }
  if (code === 95) {
    return { summary: '雷暴', icon: icon('thunderstorm') }
  }
  if (code === 96 || code === 99) {
    return { summary: '雷阵雨', icon: icon('thunderstorm-hail') }
  }
  return { summary: '未知', icon: icon('unknown') }
}

/** 中央气象台等中文摘要 → 图标（优先于 WMO 近似映射） */
export function resolveWeatherPresentationFromSummary(
  summary: string,
  isDay: boolean
): WeatherPresentation | null {
  const text = summary.trim()
  if (!text || text === '—') return null

  const rules: Array<{ pattern: RegExp; pick: () => WeatherPresentation }> = [
    {
      pattern: /雷阵雨伴有冰雹|冰雹/,
      pick: () => ({ summary: text, icon: icon('thunderstorm-hail') })
    },
    {
      pattern: /强雷阵雨/,
      pick: () => ({ summary: text, icon: icon('thunderstorm-heavy') })
    },
    {
      pattern: /雷阵雨|雷暴/,
      pick: () => ({ summary: text, icon: icon('thunderstorm') })
    },
    {
      pattern: /大暴雨到特大暴雨/,
      pick: () => ({ summary: text, icon: icon('rain-heavy-to-extreme') })
    },
    {
      pattern: /暴雨到大暴雨/,
      pick: () => ({ summary: text, icon: icon('rain-storm-to-heavy') })
    },
    {
      pattern: /大到暴雨/,
      pick: () => ({ summary: text, icon: icon('rain-heavy-storm') })
    },
    {
      pattern: /特大暴雨|极端降雨/,
      pick: () => ({ summary: text, icon: icon('rain-storm-extreme') })
    },
    {
      pattern: /大暴雨/,
      pick: () => ({ summary: text, icon: icon('rain-storm-heavy') })
    },
    {
      pattern: /暴雨/,
      pick: () => ({ summary: text, icon: icon('rain-storm') })
    },
    {
      pattern: /中到大雨|大到暴雨/,
      pick: () => ({ summary: text, icon: icon('rain-medium-heavy') })
    },
    {
      pattern: /小到中雨/,
      pick: () => ({ summary: text, icon: icon('rain-light-medium') })
    },
    {
      pattern: /大雨/,
      pick: () => ({ summary: text, icon: icon('rain-heavy') })
    },
    {
      pattern: /中雨/,
      pick: () => ({ summary: text, icon: icon('rain-medium') })
    },
    {
      pattern: /小雨|毛毛雨|细雨/,
      pick: () => ({ summary: text, icon: icon('rain-light') })
    },
    {
      pattern: /阵雨夹雪/,
      pick: () => ({
        summary: text,
        icon: dayNight('shower-sleet', 'shower-sleet-night', isDay)
      })
    },
    {
      pattern: /强阵雨/,
      pick: () => ({
        summary: text,
        icon: dayNight('shower-heavy', 'shower-heavy-night', isDay)
      })
    },
    {
      pattern: /阵雨/,
      pick: () => ({ summary: text, icon: dayNight('shower', 'shower-night', isDay) })
    },
    {
      pattern: /大到暴雪/,
      pick: () => ({ summary: text, icon: icon('snow-heavy-storm') })
    },
    {
      pattern: /中到大雪/,
      pick: () => ({ summary: text, icon: icon('snow-medium-heavy') })
    },
    {
      pattern: /小到中雪/,
      pick: () => ({ summary: text, icon: icon('snow-light-medium') })
    },
    {
      pattern: /暴雪/,
      pick: () => ({ summary: text, icon: icon('snow-storm') })
    },
    {
      pattern: /大雪/,
      pick: () => ({ summary: text, icon: icon('snow-heavy') })
    },
    {
      pattern: /中雪/,
      pick: () => ({ summary: text, icon: icon('snow-medium') })
    },
    {
      pattern: /小雪/,
      pick: () => ({ summary: text, icon: icon('snow-light') })
    },
    {
      pattern: /阵雪/,
      pick: () => ({
        summary: text,
        icon: dayNight('snow-shower', 'snow-shower-night', isDay)
      })
    },
    {
      pattern: /雨夹雪|雨雪/,
      pick: () => ({ summary: text, icon: icon('sleet') })
    },
    {
      pattern: /冻雨/,
      pick: () => ({ summary: text, icon: icon('freezing-rain') })
    },
    {
      pattern: /雨/,
      pick: () => ({ summary: text, icon: icon('rain') })
    },
    {
      pattern: /雪/,
      pick: () => ({ summary: text, icon: icon('snow') })
    },
    {
      pattern: /特强浓雾/,
      pick: () => ({ summary: text, icon: icon('fog-extreme') })
    },
    {
      pattern: /强浓雾|大雾/,
      pick: () => ({ summary: text, icon: icon('fog-heavy') })
    },
    {
      pattern: /浓雾/,
      pick: () => ({ summary: text, icon: icon('fog-dense') })
    },
    {
      pattern: /薄雾/,
      pick: () => ({ summary: text, icon: icon('fog-light') })
    },
    {
      pattern: /雾/,
      pick: () => ({ summary: text, icon: icon('fog') })
    },
    {
      pattern: /严重霾/,
      pick: () => ({ summary: text, icon: icon('haze-critical') })
    },
    {
      pattern: /重度霾/,
      pick: () => ({ summary: text, icon: icon('haze-severe') })
    },
    {
      pattern: /中度霾/,
      pick: () => ({ summary: text, icon: icon('haze-moderate') })
    },
    {
      pattern: /霾/,
      pick: () => ({ summary: text, icon: icon('haze') })
    },
    {
      pattern: /强沙尘暴/,
      pick: () => ({ summary: text, icon: icon('sandstorm-heavy') })
    },
    {
      pattern: /沙尘暴/,
      pick: () => ({ summary: text, icon: icon('sandstorm') })
    },
    {
      pattern: /扬沙/,
      pick: () => ({ summary: text, icon: icon('sand') })
    },
    {
      pattern: /浮尘/,
      pick: () => ({ summary: text, icon: icon('dust') })
    },
    {
      pattern: /龙卷风/,
      pick: () => ({ summary: text, icon: icon('tornado') })
    },
    {
      pattern: /台风/,
      pick: () => ({ summary: text, icon: icon('typhoon') })
    },
    {
      pattern: /晴间多云/,
      pick: () => ({
        summary: text,
        icon: dayNight('partly-cloudy', 'partly-cloudy-night', isDay)
      })
    },
    {
      pattern: /晴/,
      pick: () => ({ summary: text, icon: dayNight('sun', 'sun-night', isDay) })
    },
    {
      pattern: /少云/,
      pick: () => ({
        summary: text,
        icon: dayNight('few-clouds', 'few-clouds-night', isDay)
      })
    },
    {
      pattern: /多云/,
      pick: () => ({ summary: text, icon: dayNight('cloudy', 'cloudy-night', isDay) })
    },
    {
      pattern: /阴/,
      pick: () => ({ summary: text, icon: icon('overcast') })
    }
  ]

  for (const rule of rules) {
    if (rule.pattern.test(text)) return rule.pick()
  }
  return null
}
