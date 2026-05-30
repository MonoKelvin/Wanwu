import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { VehicleItem } from '../types/item'

const STORAGE_PREFIX = 'wanwu:cloud-abode:vehicle-config:'

export interface VehicleUserConfig {
  bodyColor: string
  wheelId: string
  liveryId: string
}

function readConfig(vehicleId: string, defaults: VehicleUserConfig): VehicleUserConfig {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + vehicleId)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
  }
}

function writeConfig(vehicleId: string, config: VehicleUserConfig): void {
  localStorage.setItem(STORAGE_PREFIX + vehicleId, JSON.stringify(config))
}

export const useVehicleGarageStore = defineStore('vehicleGarage', () => {
  const activeItem = ref<VehicleItem | null>(null)
  const config = ref<VehicleUserConfig | null>(null)

  function bindVehicle(item: VehicleItem) {
    activeItem.value = item
    const defaults = {
      bodyColor: item.customization.defaultConfig.bodyColor,
      wheelId: item.customization.defaultConfig.wheelId,
      liveryId: item.customization.defaultConfig.liveryId
    }
    config.value = readConfig(item.id, defaults)
  }

  function patchConfig(patch: Partial<VehicleUserConfig>) {
    if (!activeItem.value || !config.value) return
    config.value = { ...config.value, ...patch }
    writeConfig(activeItem.value.id, config.value)
  }

  watch(
    () => activeItem.value?.id,
    () => {
      /* persisted via patchConfig */
    }
  )

  return {
    activeItem,
    config,
    bindVehicle,
    patchConfig
  }
})
