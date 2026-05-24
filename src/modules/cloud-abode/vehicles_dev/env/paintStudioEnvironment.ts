import * as THREE from 'three'
import { bakePmremFromScene } from '@renderer/env/bakePmrem'

/**
 * 云斋车漆窄顶光 PMREM（无 HDR 时的 IBL 回退）
 * 极暗环境 + 小面积顶光 → 仅高光区有 subtle 反射
 */
export function buildPaintStudioProbeScene(): THREE.Scene {
  const probe = new THREE.Scene()
  probe.background = new THREE.Color(0x000000)

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(48, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
  )
  probe.add(dome)

  const spotCore = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )
  spotCore.rotation.x = -Math.PI / 2
  spotCore.position.y = 18
  probe.add(spotCore)

  const spotFalloff = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 11),
    new THREE.MeshBasicMaterial({ color: 0x909098, transparent: true, opacity: 0.22 })
  )
  spotFalloff.rotation.x = -Math.PI / 2
  spotFalloff.position.y = 17.5
  probe.add(spotFalloff)

  return probe
}

export function createPaintStudioPmrem(pmrem: THREE.PMREMGenerator): THREE.Texture {
  const probe = buildPaintStudioProbeScene()
  return bakePmremFromScene(pmrem, probe, { far: 0.04, renderTarget: 48, size: 256 })
}
