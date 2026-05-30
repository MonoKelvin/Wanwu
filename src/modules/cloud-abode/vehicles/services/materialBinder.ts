/**
 * @deprecated 请使用 vehicleShowroom.ts；保留此文件仅为兼容旧 import 路径
 */
export {
  applyBodyColor,
  collectVehicleReflectorIgnores,
  prepareVehicleForShowroom,
  prepareVehicleShell,
  resolveBodyPaintMaterial,
  setBodyEnvMapIntensity
} from './vehicleShowroom'

import {
  prepareVehicleForShowroom,
  prepareVehicleShell,
  setBodyEnvMapIntensity
} from './vehicleShowroom'
import type { VehicleCustomization } from '../types/item'
import type * as THREE from 'three'

export async function setupVehicleMaterials(
  root: THREE.Object3D,
  _customization: VehicleCustomization,
  bodyColor: string,
  bodyAoUrl?: string
): Promise<void> {
  await prepareVehicleForShowroom(root, { bodyColor, bodyAoUrl })
}

export function setVehicleEnvMapIntensity(_root: THREE.Object3D, intensity: number): void {
  setBodyEnvMapIntensity(intensity)
}

export const hideVehicleReflectShell = prepareVehicleShell
