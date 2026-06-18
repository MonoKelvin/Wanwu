/** 主进程插件引导：eager 加载各模块 main/register.ts */
import.meta.glob('../src/modules/**/main/register.ts', { eager: true })
