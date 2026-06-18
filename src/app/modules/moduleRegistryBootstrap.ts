/**
 * 模块自注册引导文件（与 moduleRegistryCore 分离，避免 Vite eager glob 引发 TDZ）。
 *
 * 执行 import.meta.glob 加载各模块的 app/register.ts；
 * 各 register 须从 moduleRegistryCore 引入 registerAppModule，而非本文件的 re-export。
 */
import.meta.glob(
  ['../../modules/**/app/register.ts', '!../../modules/cloud-abode/**'],
  { eager: true }
)
