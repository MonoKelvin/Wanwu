import type { MenuItem } from 'primevue/menuitem'
import type { WwIconName } from '@shared/icons/registry'

/** Prime Menu 模型扩展：用 Lucide 名替代 `icon: 'pi pi-*'` */
export type WwMenuItem = MenuItem & {
  wwIcon?: WwIconName
  /**
   * 互斥/单选类菜单项：定义后左侧预留对勾列，`true` 显示对勾，`false` 留空。
   * 未定义时不展示对勾列（普通操作项）。
   */
  checked?: boolean
}

/** 是否展示对勾列（互斥选项） */
export function wwMenuItemHasCheckColumn(item: WwMenuItem): boolean {
  return item.checked !== undefined
}
