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
  wheels: WheelOption[]
  liveries: LiveryOption[]
}

/** 轮毂方案：按材质名/网格名匹配并调色（v1 无需多份 GLB） */
export interface WheelOption {
  id: string
  label: string
  /** 匹配网格或材质名（不区分大小写），默认 wheel / M_wheel */
  match?: string[]
  rimColor?: string
  metalness?: number
  roughness?: number
}

/** 涂装方案：主色仍由 bodyColor 控制，可附加 accent 网格配色 */
export interface LiveryOption {
  id: string
  label: string
  accentMeshes?: string[]
  accentColor?: string
}
