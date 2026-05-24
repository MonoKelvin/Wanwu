import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export interface SmoothOrbitOptions {
  dampingFactor?: number
  rotateSpeed?: number
  zoomSpeed?: number
  panSpeed?: number
  minDistance?: number
  maxDistance?: number
}

export interface SmoothOrbitHandle {
  tickZoom: (delta: number) => void
  dispose: () => void
}

/** 阻尼 OrbitControls（原生滚轮缩放，绑定在容器上） */
export function configureSmoothOrbitControls(
  controls: OrbitControls,
  _camera: THREE.PerspectiveCamera,
  options: SmoothOrbitOptions = {}
): SmoothOrbitHandle {
  const {
    dampingFactor = 0.08,
    rotateSpeed = 0.45,
    zoomSpeed = 0.28,
    panSpeed = 0.45,
    minDistance = 3,
    maxDistance = 14
  } = options

  controls.enableDamping = true
  controls.dampingFactor = dampingFactor
  controls.rotateSpeed = rotateSpeed
  controls.zoomSpeed = zoomSpeed
  controls.panSpeed = panSpeed
  controls.screenSpacePanning = true
  controls.enablePan = true
  controls.enableZoom = true
  controls.minDistance = minDistance
  controls.maxDistance = maxDistance
  controls.minPolarAngle = 0.12
  controls.maxPolarAngle = Math.PI / 2 - 0.08
  controls.zoomToCursor = true

  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  }

  return { tickZoom: () => undefined, dispose: () => undefined }
}
