/** 引导壳层与各模块 domain/localStorageKeysContributor.ts 自注册 */
import './frameworkLocalStorageKeysContributor'
import.meta.glob('../../modules/**/domain/localStorageKeysContributor.ts', { eager: true })
