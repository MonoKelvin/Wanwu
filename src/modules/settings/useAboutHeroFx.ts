import { onUnmounted, ref, watch, type Ref } from 'vue'

export const PARTICLE_COUNT = 9

export type ParticleDepthBand = 'far' | 'mid' | 'near'
export type RibbonDepth = 'far' | 'mid' | 'near'
/** glow=几乎不糊，仅微辉光；soft=小模糊；mid=中模糊；heavy=大模糊 */
export type RibbonBlurMode = 'glow' | 'soft' | 'mid' | 'heavy'

export interface FxParticle {
  x: number
  y: number
  vx: number
  vy: number
  depth: number
  depthBand: ParticleDepthBand
  phase: number
  seed: number
  wander: number
  burstIn: number
}

export interface FxRibbon {
  d: string
  depth: RibbonDepth
  seed: number
  blur: RibbonBlurMode
}

export const FX_RIBBONS: FxRibbon[] = [
  { depth: 'far', seed: 11.3, blur: 'glow', d: 'M-52,44 C55,30 155,54 245,36 S395,50 452,34' },
  { depth: 'far', seed: 27.8, blur: 'soft', d: 'M-52,60 C80,72 185,44 278,62 S388,40 452,56' },
  { depth: 'far', seed: 43.1, blur: 'mid', d: 'M-52,28 C105,38 210,18 305,32 S380,24 452,40' },
  { depth: 'mid', seed: 58.6, blur: 'glow', d: 'M-52,34 C90,50 205,22 302,42 S382,28 452,46' },
  { depth: 'mid', seed: 71.2, blur: 'soft', d: 'M-52,52 C60,38 172,64 262,44 S372,58 452,36' },
  { depth: 'mid', seed: 89.5, blur: 'mid', d: 'M-52,40 C73,56 198,28 292,52 S396,34 452,48' },
  { depth: 'near', seed: 104.7, blur: 'heavy', d: 'M-52,46 C100,58 218,32 318,54 S390,38 452,50' },
  { depth: 'near', seed: 118.9, blur: 'soft', d: 'M-52,36 C77,24 188,58 284,38 S398,52 452,42' }
]

const BOUNDS = { minX: 0.04, maxX: 0.96, minY: 0.08, maxY: 0.92 }
const DEPTH_BANDS = [0.1, 0.17, 0.26, 0.36, 0.48, 0.58, 0.68, 0.78, 0.9]
/** 全局动画时间缩放（越小越慢） */
const ANIM_TIME_SCALE = 0.38

export function seeded01(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function depthBand(depth: number): ParticleDepthBand {
  if (depth < 0.35) return 'far'
  if (depth < 0.68) return 'mid'
  return 'near'
}

function depthMul(depth: RibbonDepth): number {
  return depth === 'near' ? 1.4 : depth === 'mid' ? 1 : 0.72
}

function maxSpeed(depth: number): number {
  return 0.014 + depth * 0.038
}

function pickVelocity(p: FxParticle, scale = 1): void {
  const bias = p.wander
  const angle = bias + (Math.random() - 0.5) * Math.PI * 1.35
  const spd = maxSpeed(p.depth) * scale * (0.35 + Math.random() * 0.75)
  p.vx = Math.cos(angle) * spd
  p.vy = Math.sin(angle) * spd
}

function redirectInward(p: FxParticle): void {
  p.wander = Math.atan2(0.5 - p.y, 0.5 - p.x) + (Math.random() - 0.5) * 2.4
  const spd = maxSpeed(p.depth) * (0.4 + Math.random() * 0.6)
  p.vx = Math.cos(p.wander) * spd
  p.vy = Math.sin(p.wander) * spd
  p.phase += 0.8 + Math.random() * 1.2
}

export function createFxParticles(): FxParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const s1 = seeded01(i * 3.71 + 1.2)
    const s2 = seeded01(i * 5.13 + 2.8)
    const s3 = seeded01(i * 7.91 + 0.4)
    const depth = DEPTH_BANDS[i] + (s3 - 0.5) * 0.05
    const p: FxParticle = {
      x: BOUNDS.minX + s1 * (BOUNDS.maxX - BOUNDS.minX),
      y: BOUNDS.minY + s2 * (BOUNDS.maxY - BOUNDS.minY),
      vx: 0,
      vy: 0,
      depth,
      depthBand: depthBand(depth),
      phase: s2 * Math.PI * 2,
      seed: i * 13.7 + s3 * 100,
      wander: s1 * Math.PI * 2,
      burstIn: seeded01(i * 11.3) * 4
    }
    pickVelocity(p, 0.85 + s3 * 0.5)
    return p
  })
}

export function ribbonWrapStyle(r: FxRibbon, t: number): Record<string, string> {
  const time = t * ANIM_TIME_SCALE
  const mul = depthMul(r.depth)
  const s = r.seed
  const x = (Math.sin(time * 0.62 + s) * 16 + Math.sin(time * 1.05 + s * 1.6) * 9) * mul
  const y = (Math.cos(time * 0.54 + s * 1.2) * 12 + Math.cos(time * 0.88 + s * 0.7) * 7) * mul
  const rot = Math.sin(time * 0.36 + s * 0.5) * 2.2 * mul
  const scale = 1 + Math.sin(time * 0.44 + s * 0.85) * 0.04 * mul

  return {
    transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`
  }
}

function ribbonGlowShadow(focus: number, min: number, max: number): string {
  const spread = min + focus * (max - min)
  return `drop-shadow(0 0 ${spread.toFixed(1)}px var(--ww-about-fx-ribbon-glow))`
}

function ribbonFilter(r: FxRibbon, focus: number): string {
  const f = focus
  switch (r.blur) {
    case 'glow': {
      const blur = 0.35 + f * 0.35
      return `blur(${blur.toFixed(2)}px) ${ribbonGlowShadow(f, 2.5, 5.5)}`
    }
    case 'soft': {
      const blur = 1.5 + (1 - f) * 1.1
      return `blur(${blur.toFixed(2)}px) ${ribbonGlowShadow(f, 0.8, 2.2)}`
    }
    case 'mid': {
      const blur = 3.8 + (1 - f) * 2.2
      return `blur(${blur.toFixed(2)}px)`
    }
    case 'heavy': {
      const blur = 11.5 + (1 - f) * 3.5
      return `blur(${blur.toFixed(2)}px)`
    }
  }
}

function ribbonOpacity(r: FxRibbon, focus: number): number {
  const base =
    r.blur === 'glow'
      ? 0.48
      : r.blur === 'soft'
        ? 0.4
        : r.blur === 'mid'
          ? 0.34
          : 0.26
  const swing =
    r.blur === 'glow' ? 0.14 : r.blur === 'soft' ? 0.16 : r.blur === 'mid' ? 0.14 : 0.12
  return base + focus * swing
}

export function ribbonPathStyle(r: FxRibbon, t: number): Record<string, string> {
  const time = t * ANIM_TIME_SCALE
  const focus = 0.5 + 0.5 * Math.sin(time * 0.72 + r.seed * 1.15)

  return {
    opacity: ribbonOpacity(r, focus).toFixed(3),
    filter: ribbonFilter(r, focus)
  }
}

export function particleStyle(p: FxParticle): Record<string, string> {
  const pulseSpeed = 0.75 + p.depth * 0.95 + seeded01(p.seed * 9.4) * 0.5
  const pulse = 0.5 + 0.5 * Math.sin(p.phase * pulseSpeed + p.seed * 0.08)
  const depthWave = 0.5 + 0.5 * Math.sin(p.phase * (0.5 + seeded01(p.seed * 6.2) * 0.4) + p.seed * 0.12)
  const wobble2 = Math.sin(p.phase * (3.2 + seeded01(p.seed * 11.7) * 2.4) + p.seed * 1.9)
  const wobble3 = Math.cos(p.phase * (1.5 + seeded01(p.seed * 14.3) * 1.6) + p.seed * 2.3)
  const depthStrength = 0.4 + p.depth * 0.6

  const baseSize =
    p.depthBand === 'near'
      ? 16 + p.depth * 12
      : p.depthBand === 'mid'
        ? 6 + p.depth * 5
        : 3 + p.depth * 2.5
  const size = baseSize * (0.88 + pulse * 0.22 * depthStrength)

  const baseBlur =
    p.depthBand === 'near'
      ? 12 + p.depth * 10
      : p.depthBand === 'mid'
        ? 1.8 + p.depth * 3
        : 0.5 + p.depth * 1
  const blur = baseBlur * (1 + (1 - pulse) * 0.55 * depthStrength)

  const baseOpacity =
    p.depthBand === 'near'
      ? 0.22 + (1 - p.depth) * 0.1
      : p.depthBand === 'mid'
        ? 0.32 + p.depth * 0.14
        : 0.42 + p.depth * 0.18
  const opacity = baseOpacity * (0.75 + pulse * 0.35)

  const parallaxX =
    (depthWave - 0.5) * (10 + p.depth * 22) + wobble2 * (4 + p.depth * 8)
  const parallaxY =
    (pulse - 0.5) * (8 + p.depth * 14) + wobble3 * (3 + p.depth * 7)
  const scale = 0.84 + pulse * 0.24 * (0.5 + p.depth * 0.5)
  const rot = (wobble2 * 8 + wobble3 * 5) * p.depth * depthStrength

  return {
    left: `calc(${p.x * 100}% + ${parallaxX.toFixed(2)}px)`,
    top: `calc(${p.y * 100}% + ${parallaxY.toFixed(2)}px)`,
    zIndex: String(Math.round(p.depth * 20 + pulse * 4)),
    width: `${size.toFixed(2)}px`,
    height: `${size.toFixed(2)}px`,
    opacity: opacity.toFixed(3),
    transform: `translate(-50%, -50%) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`,
    filter: `blur(${blur.toFixed(2)}px)`
  }
}

function updateParticles(particles: FxParticle[], dt: number, t: number): void {
  const step = Math.min(dt, 0.05)

  for (const p of particles) {
    p.phase += step * (0.38 + p.depth * 0.32)
    p.burstIn -= step

    const depthScale = 0.5 + p.depth * 0.5
    const nudge = 0.007 * depthScale
    const orbitX = Math.sin(p.phase * 2.3 + p.seed) * nudge
    const orbitY = Math.cos(p.phase * 1.65 + p.seed * 1.4) * nudge
    const windX = Math.sin(t * ANIM_TIME_SCALE * 0.45 + p.seed) * 0.0022 * (1.1 - p.depth * 0.3)
    const windY = Math.cos(t * ANIM_TIME_SCALE * 0.36 + p.seed * 0.7) * 0.0018

    p.vx += orbitX + windX
    p.vy += orbitY + windY

    const wanderRate = (0.028 + p.depth * 0.04) * step
    p.wander += (Math.random() - 0.5) * wanderRate
    const pull = 0.0022 * (0.45 + p.depth * 0.55)
    p.vx += Math.cos(p.wander) * pull
    p.vy += Math.sin(p.wander) * pull

    const curlX = Math.sin(p.x * 14 + t * 0.55 + p.seed) * Math.cos(p.y * 11 + t * 0.4)
    const curlY = Math.cos(p.x * 12 + t * 0.48 + p.seed * 1.2) * Math.sin(p.y * 13 + t * 0.35)
    p.vx += curlX * 0.0045 * depthScale
    p.vy += curlY * 0.0045 * depthScale

    if (Math.random() < 0.022) {
      p.vx += (Math.random() - 0.5) * 0.012 * depthScale
      p.vy += (Math.random() - 0.5) * 0.012 * depthScale
    }

    if (p.burstIn <= 0 && Math.random() < 0.012 * depthScale) {
      pickVelocity(p, 0.75 + Math.random() * 0.9)
      p.burstIn = 1.2 + Math.random() * 2.8
    } else if (Math.random() < 0.008) {
      pickVelocity(p, 0.45 + Math.random() * 0.55)
    }

    const cap = maxSpeed(p.depth) * (p.burstIn > 0 ? 1.45 : 1)
    let spd = Math.hypot(p.vx, p.vy)
    if (spd > cap) {
      p.vx = (p.vx / spd) * cap
      p.vy = (p.vy / spd) * cap
    } else if (spd < cap * 0.1) {
      pickVelocity(p, 0.55)
    }

    p.x += p.vx * step
    p.y += p.vy * step

    const pad = 0.012
    if (
      p.x < BOUNDS.minX - pad ||
      p.x > BOUNDS.maxX + pad ||
      p.y < BOUNDS.minY - pad ||
      p.y > BOUNDS.maxY + pad
    ) {
      p.x = clamp(p.x, BOUNDS.minX, BOUNDS.maxX)
      p.y = clamp(p.y, BOUNDS.minY, BOUNDS.maxY)
      redirectInward(p)
    }
  }
}

export function planeStyle(depth: RibbonDepth, t: number): Record<string, string> {
  const time = t * ANIM_TIME_SCALE
  const s = depth === 'far' ? 0 : depth === 'mid' ? 1.7 : 3.1
  const breath = 0.5 + 0.5 * Math.sin(time * (depth === 'far' ? 0.38 : depth === 'mid' ? 0.52 : 0.68) + s)
  if (depth === 'far') {
    return {
      opacity: String(0.5 + breath * 0.22),
      transform: `scale(${(1.03 + breath * 0.035).toFixed(4)})`,
      filter: `blur(${(1.4 - breath * 0.55).toFixed(2)}px)`
    }
  }
  if (depth === 'mid') {
    return {
      opacity: String(0.88 + breath * 0.1),
      transform: `scale(${(0.995 + breath * 0.018).toFixed(4)})`,
      filter: `blur(${(0.25 + (1 - breath) * 0.5).toFixed(2)}px)`
    }
  }
  return {
    opacity: String(0.78 + breath * 0.14),
    transform: `scale(${(1.02 + breath * 0.04).toFixed(4)})`,
    filter: `blur(${(0.6 + breath * 0.9).toFixed(2)}px)`
  }
}

export function useAboutHeroFx(active: Ref<boolean>, visible: Ref<boolean>) {
  const particles = ref<FxParticle[]>(createFxParticles())
  const showFx = ref(0)
  const animTime = ref(0)

  let frameId = 0
  let lastTick = 0
  let elapsed = 0
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function tick(now: number) {
    if (!lastTick) lastTick = now
    const dt = (now - lastTick) / 1000
    lastTick = now

    const target = active.value ? 1 : 0
    showFx.value += (target - showFx.value) * (active.value ? 0.14 : 0.1)

    const running = visible.value && !prefersReducedMotion && (active.value || showFx.value > 0.02)
    if (running) {
      elapsed += dt
      animTime.value = elapsed
      if (active.value) {
        updateParticles(particles.value, dt, elapsed)
      }
    }

    if (visible.value && (active.value || showFx.value > 0.006)) {
      frameId = requestAnimationFrame(tick)
    } else {
      frameId = 0
      lastTick = 0
      if (!active.value && showFx.value < 0.006) showFx.value = 0
    }
  }

  function startLoop() {
    if (!visible.value || frameId) return
    lastTick = 0
    frameId = requestAnimationFrame(tick)
  }

  function stopLoop() {
    cancelAnimationFrame(frameId)
    frameId = 0
    lastTick = 0
  }

  function reset() {
    particles.value = createFxParticles()
    elapsed = 0
    animTime.value = 0
  }

  watch(active, (on) => {
    if (!visible.value) return
    if (on) {
      reset()
      startLoop()
    } else {
      startLoop()
    }
  })

  watch(visible, (on) => {
    if (on) {
      startLoop()
    } else {
      stopLoop()
      showFx.value = 0
      animTime.value = 0
    }
  })

  onUnmounted(stopLoop)

  return {
    particles,
    showFx,
    animTime,
    startLoop,
    stopLoop,
    reset,
    particleStyle,
    ribbonWrapStyle,
    ribbonPathStyle,
    planeStyle,
    ribbons: FX_RIBBONS
  }
}
