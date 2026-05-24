import * as THREE from 'three'

/** 风阻可视化流线（云斋 aero 模式占位） */
export function createAeroWindLines(): THREE.LineSegments {
  const count = 48
  const positions = new Float32Array(count * 2 * 3)
  let i = 0
  for (let n = 0; n < count; n++) {
    const y = (Math.random() - 0.5) * 1.2
    const z = -6 - Math.random() * 8
    const x0 = -4 - Math.random() * 2
    const x1 = 4 + Math.random() * 2
    positions[i++] = x0
    positions[i++] = y
    positions[i++] = z
    positions[i++] = x1
    positions[i++] = y + (Math.random() - 0.5) * 0.15
    positions[i++] = z + (Math.random() - 0.5) * 0.4
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.LineBasicMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  const lines = new THREE.LineSegments(geometry, material)
  lines.name = 'AeroWindLines'
  lines.visible = false
  lines.renderOrder = 10
  return lines
}

export function scrollAeroWindLines(lines: THREE.LineSegments, speed: number, dt: number): void {
  if (!lines.visible) return
  const attr = lines.geometry.getAttribute('position') as THREE.BufferAttribute
  const arr = attr.array as Float32Array
  for (let i = 0; i < arr.length; i += 3) {
    arr[i + 2] += speed * dt * 2.4
    if (arr[i + 2] > 2) arr[i + 2] -= 14
  }
  attr.needsUpdate = true
}
