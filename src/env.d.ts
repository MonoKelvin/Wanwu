/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

import type { WanwuApi } from '@shared/types/api'

declare global {
  interface Window {
    wanwu: WanwuApi
  }
}

export {}
