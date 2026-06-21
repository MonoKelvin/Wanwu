/** WMO weather code + 昼夜 → 中文摘要与 SVG 图标 id */
import type { WeatherIconId } from '@modules/weather/domain/weatherIconIds'

export interface WeatherPresentation {
  summary: string
  icon: WeatherIconId
}

function dayNight(day: WeatherIconId, night: WeatherIconId, isDay: boolean): WeatherIconId {
  return isDay ? day : night
}

/** WMO weather code + 昼夜 → 中文摘要与 SVG 图标 */
export function resolveWeatherPresentation(code: number, isDay: boolean): WeatherPresentation {
  if (code === 0) {
    return { summary: '晴', icon: dayNight('weather-sun', 'weather-moon', isDay) }
  }
  if (code === 1) {
    return {
      summary: '少云',
      icon: dayNight('weather-sun-partly-cloudy', 'weather-moon-partly-cloudy', isDay)
    }
  }
  if (code === 2) {
    return {
      summary: '多云',
      icon: dayNight('weather-sun-cloudy', 'weather-moon-cloudy', isDay)
    }
  }
  if (code === 3) {
    return {
      summary: '阴',
      icon: dayNight('weather-sun-overcast', 'weather-moon-overcast', isDay)
    }
  }
  if (code === 45) {
    return {
      summary: '雾',
      icon: dayNight('weather-fog-sun', 'weather-fog-moon', isDay)
    }
  }
  if (code === 48) {
    return {
      summary: '雾凇',
      icon: dayNight('weather-fog-sun-heavy', 'weather-fog-moon-heavy', isDay)
    }
  }
  if (code >= 51 && code <= 55) {
    return { summary: '毛毛雨', icon: 'weather-drizzle' }
  }
  if (code === 56 || code === 57) {
    return {
      summary: '冻毛毛雨',
      icon: dayNight('weather-sun-snow-rain', 'weather-moon-snow-rain', isDay)
    }
  }
  if (code === 61) {
    return {
      summary: '小雨',
      icon: dayNight('weather-sun-rain-light', 'weather-moon-rain-light', isDay)
    }
  }
  if (code === 63) {
    return {
      summary: '中雨',
      icon: dayNight('weather-sun-rain-medium', 'weather-moon-rain-medium', isDay)
    }
  }
  if (code === 65) {
    return {
      summary: '大雨',
      icon: dayNight('weather-sun-rain-heavy', 'weather-moon-rain-heavy', isDay)
    }
  }
  if (code === 66 || code === 67) {
    return {
      summary: '冻雨',
      icon: dayNight('weather-sun-snow-rain', 'weather-moon-snow-rain', isDay)
    }
  }
  if (code === 71) {
    return {
      summary: '小雪',
      icon: dayNight('weather-sun-snow-light', 'weather-moon-snow-light', isDay)
    }
  }
  if (code === 73) {
    return {
      summary: '中雪',
      icon: dayNight('weather-sun-snow', 'weather-moon-snow', isDay)
    }
  }
  if (code === 75) {
    return {
      summary: '大雪',
      icon: dayNight('weather-sun-snow-heavy', 'weather-moon-snow-heavy', isDay)
    }
  }
  if (code === 77) {
    return { summary: '雪粒', icon: 'weather-snowflake' }
  }
  if (code === 80) {
    return {
      summary: '阵雨',
      icon: dayNight('weather-sun-rain', 'weather-moon-rain', isDay)
    }
  }
  if (code === 81) {
    return { summary: '中阵雨', icon: 'weather-umbrella-rain-medium' }
  }
  if (code === 82) {
    return { summary: '大阵雨', icon: 'weather-umbrella-rain-heavy' }
  }
  if (code === 85) {
    return {
      summary: '阵雪',
      icon: dayNight('weather-sun-snow', 'weather-moon-snow', isDay)
    }
  }
  if (code === 86) {
    return {
      summary: '大阵雪',
      icon: dayNight('weather-sun-snow-storm', 'weather-moon-snow-storm', isDay)
    }
  }
  if (code === 95) {
    return {
      summary: '雷暴',
      icon: dayNight('weather-sun-lightning', 'weather-lightning', isDay)
    }
  }
  if (code === 96 || code === 99) {
    return { summary: '雷阵雨', icon: 'weather-lightning-rain' }
  }
  return { summary: '未知', icon: 'weather-unknown' }
}
