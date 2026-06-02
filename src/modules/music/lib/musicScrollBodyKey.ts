import type { InjectionKey, Ref } from 'vue'

export const musicScrollBodyKey: InjectionKey<Ref<HTMLElement | null>> = Symbol('musicScrollBody')
