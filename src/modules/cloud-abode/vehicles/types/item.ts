/** 与 assets/seed/cloud-abode/vehicles/catalog.json 一致 */
export interface VehicleCatalog {
  version: number
  vehicles: VehicleCatalogEntry[]
}

export interface VehicleCatalogEntry {
  /** 与 item.json 的 id 相同（UUID） */
  id: string
  /** 产品目录名，如 xiaomi-su7 */
  slug: string
  itemFile: string
}

/**
 * 与 items/{slug}/item.json 一致。
 * - mesh/*、texture/*：相对于 items/{slug}/（仅车型模型相关）
 * - 展厅场景、HDR、BGM 等见 `config/showroomAssets.ts`
 */
export interface VehicleItem {
  id: string
  slug: string
  name: string
  brand: string
  summary: string
  thumb: string
  model: {
    path: string
    format: 'gltf' | 'glb'
  }
  textures?: {
    bodyAo?: string
  }
  customization: VehicleCustomization
}

export interface VehicleCustomization {
  defaultConfig: {
    bodyColor: string
    wheelId: string
    liveryId: string
  }
  paintMeshes: string[]
  wheels: Array<{ id: string; label: string }>
  liveries: Array<{ id: string; label: string }>
}
