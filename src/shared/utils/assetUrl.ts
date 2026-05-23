/** 仓库 assets/ 根目录（dev/build 下通过 import.meta.url 解析） */
const ASSETS_ROOT = new URL('../../../assets/', import.meta.url)

/** @param path 相对于 assets/ 的路径，如 hdr/t_env_light.hdr */
export function assetUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\//, '')
  return new URL(normalized, ASSETS_ROOT).href
}

export function vehicleItemAssetUrl(slug: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\//, '')
  return assetUrl(`seed/cloud-abode/vehicles/items/${slug}/${normalized}`)
}
