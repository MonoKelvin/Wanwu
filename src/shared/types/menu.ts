import type { MenuItem } from 'primevue/menuitem'
import type { WwIconName } from '@shared/icons/registry'

/** Prime Menu 模型扩展：用 Lucide 名替代 `icon: 'pi pi-*'` */
export type WwMenuItem = MenuItem & { wwIcon?: WwIconName }
