import catalogJson from '@assets/seed/cloud-abode/vehicles/catalog.json'
import xiaomiSu7Item from '@assets/seed/cloud-abode/vehicles/items/xiaomi-su7/item.json'
import type { VehicleCatalog, VehicleItem } from '../types/item'

const catalog = catalogJson as VehicleCatalog

const ITEM_BY_SLUG: Record<string, VehicleItem> = {
  'xiaomi-su7': xiaomiSu7Item as VehicleItem
}

export function getVehicleCatalog(): VehicleCatalog {
  return catalog
}

export function loadVehicleItem(slug: string): VehicleItem | undefined {
  return ITEM_BY_SLUG[slug]
}

export function vehicleDisplayName(slug: string): string {
  return ITEM_BY_SLUG[slug]?.name ?? slug
}
