import packageJson from '../../../package.json'

/** 应用版本（唯一来源：根目录 package.json 的 version 字段） */
export const APP_VERSION = packageJson.version

/** 关于页等 UI 展示用，默认带 v 前缀 */
export function formatAppVersionLabel(prefix = 'v'): string {
  return `${prefix}${APP_VERSION}`
}
