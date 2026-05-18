/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

import type { WanwuApi } from '@shared/types/api'

declare global {
  interface Window {
    wanwu: WanwuApi
  }
}

export {}
