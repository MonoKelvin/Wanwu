import { ParticleSystem } from '@renderer/effects/ParticleSystem'

/** 速度线粒子 — 云斋 rush 模式 */
export function createSpeedStreakParticles(): ParticleSystem {
  return new ParticleSystem({
    count: 384,
    color: 0x66ccff,
    size: 5,
    lifetime: 1.4,
    spawnHalfExtents: [0.35, 0.2, 1.2]
  })
}

/** 火花/尘粒预设 */
export function createExhaustSparkParticles(): ParticleSystem {
  return new ParticleSystem({
    count: 128,
    color: 0xffaa55,
    size: 3,
    lifetime: 0.8,
    spawnHalfExtents: [0.15, 0.08, 0.25]
  })
}
