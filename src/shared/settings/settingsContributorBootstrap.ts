/** 引导各模块 domain/settingsContributor.ts 自注册（主进程与渲染进程均须 import） */
import.meta.glob('../../modules/**/domain/settingsContributor.ts', { eager: true })
