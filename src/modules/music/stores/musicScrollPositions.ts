/** 音乐模块各页滚动位置（配合 KeepAlive 还原） */
const positions = new Map<string, number>()
const MAX_SCROLL_KEYS = 48

function trimScrollCache() {
  while (positions.size > MAX_SCROLL_KEYS) {
    const first = positions.keys().next().value
    if (first == null) break
    positions.delete(first)
  }
}

export const musicScrollPositions = {
  get(key: string): number {
    return positions.get(key) ?? 0
  },
  set(key: string, top: number): void {
    if (!Number.isFinite(top) || top < 0) return
    if (positions.has(key)) positions.delete(key)
    positions.set(key, top)
    trimScrollCache()
  },
  reset(keys: string | readonly string[]): void {
    const list = typeof keys === 'string' ? [keys] : keys
    for (const k of list) positions.set(k, 0)
  },
  /** 切换发现/分类/我的 Tab 时归零 */
  resetMainTabs(): void {
    this.reset(['music-discover', 'music-categories', 'music-mine'] as const)
  },
  clearAll(): void {
    positions.clear()
  }
}

/** 将已缓存的主 Tab 滚动立即应用到 DOM（切换 Tab 时） */
export function applyMainTabScrollReset(): void {
  musicScrollPositions.resetMainTabs()
  for (const key of ['music-discover', 'music-categories', 'music-mine'] as const) {
    const el = document.querySelector<HTMLElement>(
      `.ww-music-stage .ww-scroll-main[data-scroll-key="${key}"]`
    )
    if (el) el.scrollTop = 0
  }
}
