import * as THREE from 'three'

/** 云斋行驶模式镜头微动 */
export class DriveCameraShake {
  private intensity = 0
  private readonly offsetY = { value: 0 }
  private appliedY = 0
  private time = 0

  setIntensity(value: number): void {
    this.intensity = Math.max(0, value)
    if (value <= 0) {
      this.offsetY.value = 0
      this.appliedY = 0
    }
  }

  get currentIntensity(): number {
    return this.intensity
  }

  apply(camera: THREE.PerspectiveCamera, dt: number): void {
    camera.position.y -= this.appliedY

    if (this.intensity <= 0.001) {
      this.appliedY = 0
      return
    }

    this.time += dt
    const amp = 0.035 * this.intensity
    const targetY =
      Math.sin(this.time * 1.4) * 0.55 * amp +
      Math.sin(this.time * 2.7 + 1.2) * 0.35 * amp +
      Math.cos(this.time * 0.85 + 0.4) * 0.1 * amp

    const blend = 1 - Math.exp(-dt * 4)
    this.offsetY.value += (targetY - this.offsetY.value) * blend
    this.appliedY = this.offsetY.value
    camera.position.y += this.appliedY
  }

  reset(): void {
    this.time = 0
    this.offsetY.value = 0
    this.appliedY = 0
    this.intensity = 0
  }
}
