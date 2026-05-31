export interface LrcLine {
  timeSec: number
  text: string
}

export function parseLrc(raw: string): LrcLine[] {
  const lines: LrcLine[] = []
  for (const line of raw.split('\n')) {
    const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/)
    if (!m) continue
    const min = parseInt(m[1]!, 10)
    const sec = parseFloat(m[2]!)
    const text = (m[3] ?? '').trim()
    lines.push({ timeSec: min * 60 + sec, text })
  }
  return lines.sort((a, b) => a.timeSec - b.timeSec)
}

export function lrcLineAt(lines: LrcLine[], t: number): number {
  if (!lines.length || !Number.isFinite(t)) return -1
  let idx = -1
  for (let i = 0; i < lines.length; i++) {
    const sec = lines[i]!.timeSec
    if (!Number.isFinite(sec)) continue
    if (sec <= t) idx = i
    else break
  }
  return idx
}
