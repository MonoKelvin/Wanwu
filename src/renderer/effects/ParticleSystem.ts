import * as THREE from 'three'

export interface ParticleSystemOptions {
  count?: number
  color?: THREE.ColorRepresentation
  size?: number
  lifetime?: number
  spawnHalfExtents?: THREE.Vector3Tuple
}

const VERT = /* glsl */ `
attribute float aLife;
attribute float aMaxLife;
attribute vec3 aVelocity;

uniform float uTime;
uniform float uSize;

varying float vAlpha;

void main() {
  float age = mod(uTime + aLife, aMaxLife);
  float lifeRatio = age / aMaxLife;
  vec3 pos = position + aVelocity * age;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * (300.0 / -mvPosition.z);
  vAlpha = 1.0 - lifeRatio;
}
`

const FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float soft = smoothstep(0.5, 0.15, d);
  gl_FragColor = vec4(uColor, vAlpha * soft);
}
`

/** 通用 GPU 粒子系统 — THREE.Points + 自定义 shader */
export class ParticleSystem {
  readonly object: THREE.Points
  private readonly material: THREE.ShaderMaterial
  private elapsed = 0
  private timeScale = 1

  constructor(options: ParticleSystemOptions = {}) {
    const count = options.count ?? 512
    const lifetime = options.lifetime ?? 2.5
    const [hx, hy, hz] = options.spawnHalfExtents ?? [2, 1, 2]

    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const lives = new Float32Array(count)
    const maxLives = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * hx
      positions[i * 3 + 1] = Math.random() * hy
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * hz
      velocities[i * 3] = (Math.random() - 0.5) * 0.4
      velocities[i * 3 + 1] = Math.random() * 0.6 + 0.1
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4
      lives[i] = Math.random() * lifetime
      maxLives[i] = lifetime * (0.6 + Math.random() * 0.8)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('aLife', new THREE.BufferAttribute(lives, 1))
    geometry.setAttribute('aMaxLife', new THREE.BufferAttribute(maxLives, 1))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: options.size ?? 6 },
        uColor: { value: new THREE.Color(options.color ?? 0xffffff) }
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    this.object = new THREE.Points(geometry, this.material)
    this.object.frustumCulled = false
    this.object.name = 'ParticleSystem'
  }

  setColor(color: THREE.ColorRepresentation): void {
    this.material.uniforms.uColor.value.set(color)
  }

  setSize(size: number): void {
    this.material.uniforms.uSize.value = size
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible
  }

  /** 时间缩放 — 用于随车速加速粒子动画 */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale)
  }

  attachTo(parent: THREE.Object3D, localPosition?: THREE.Vector3Tuple): void {
    if (localPosition) {
      this.object.position.set(localPosition[0], localPosition[1], localPosition[2])
    }
    parent.add(this.object)
  }

  update(dt: number): void {
    this.elapsed += dt * this.timeScale
    this.material.uniforms.uTime.value = this.elapsed
  }

  dispose(): void {
    this.object.geometry.dispose()
    this.material.dispose()
  }
}
