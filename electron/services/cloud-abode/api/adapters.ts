const JOKES_FALLBACK = [
  '为什么程序员分不清万圣节和圣诞节？因为 Oct 31 == Dec 25。',
  '云斋提醒：今日宜攒钱，忌冲动消费。',
  '脑筋急转弯：什么书买不到？答案：秘书。'
]

const KANA_ROWS = [
  { kana: 'あ', romaji: 'a' },
  { kana: 'い', romaji: 'i' },
  { kana: 'う', romaji: 'u' },
  { kana: 'え', romaji: 'e' },
  { kana: 'お', romaji: 'o' }
]

const WORDS_FALLBACK = [
  { word: 'serendipity', meaning: '意外发现珍奇事物的能力' },
  { word: 'abode', meaning: '住所；居所' },
  { word: 'collect', meaning: '收集；收藏' }
]

const POEMS_FALLBACK = [
  '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
  '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。'
]

export async function fetchHitokoto(): Promise<string> {
  try {
    const res = await fetch('https://v1.hitokoto.cn/?encode=json', {
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as { hitokoto?: string; from?: string }
    return data.hitokoto ? `${data.hitokoto}${data.from ? ` —— ${data.from}` : ''}` : JOKES_FALLBACK[0]!
  } catch {
    return JOKES_FALLBACK[Math.floor(Math.random() * JOKES_FALLBACK.length)]!
  }
}

export async function fetchJoke(): Promise<string> {
  try {
    const res = await fetch('https://official-joke-api.appspot.com/random_joke', {
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as { setup?: string; punchline?: string }
    if (data.setup && data.punchline) return `${data.setup}\n${data.punchline}`
  } catch {
    /* fallback */
  }
  return JOKES_FALLBACK[Math.floor(Math.random() * JOKES_FALLBACK.length)]!
}

export async function fetchDailyPoem(): Promise<string> {
  try {
    const res = await fetch('https://v1.jinrishici.com/all.json', {
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as { content?: string; author?: string; origin?: string }
    if (data.content) {
      return `${data.content}${data.author ? `\n—— ${data.author}` : ''}${data.origin ? `《${data.origin}》` : ''}`
    }
  } catch {
    /* fallback */
  }
  return POEMS_FALLBACK[Math.floor(Math.random() * POEMS_FALLBACK.length)]!
}

export async function fetchWord(): Promise<string> {
  const pick = WORDS_FALLBACK[Math.floor(Math.random() * WORDS_FALLBACK.length)]!
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(pick.word)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = (await res.json()) as Array<{
        word: string
        meanings?: Array<{ definitions?: Array<{ definition?: string }> }>
      }>
      const def = data[0]?.meanings?.[0]?.definitions?.[0]?.definition
      if (def) return `${data[0]!.word}: ${def}`
    }
  } catch {
    /* fallback */
  }
  return `${pick.word}: ${pick.meaning}`
}

export function fetchKanaLesson(): string {
  const row = KANA_ROWS[Math.floor(Math.random() * KANA_ROWS.length)]!
  return `五十音：${row.kana} (${row.romaji})`
}

export async function fetchWeatherReward(lat = 39.9, lon = 116.4): Promise<{
  summary: string
  rewardCents: number
}> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as {
      current?: { weather_code?: number; temperature_2m?: number }
    }
    const code = data.current?.weather_code ?? 0
    const temp = data.current?.temperature_2m ?? 20
    const summary = `当前 ${temp}°C，天气码 ${code}`
    const good = code <= 3 || (code >= 51 && code <= 55)
    const bad = code >= 61 && code <= 67
    let rewardCents = 0
    if (good) rewardCents = 50 + Math.floor(Math.random() * 150)
    else if (bad) rewardCents = -(50 + Math.floor(Math.random() * 100))
    return { summary, rewardCents }
  } catch {
    return { summary: '天气数据暂不可用', rewardCents: 0 }
  }
}
