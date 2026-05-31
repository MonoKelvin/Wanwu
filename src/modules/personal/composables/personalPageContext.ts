import type { InjectionKey } from 'vue'
import type { usePersonalPage } from '@modules/personal/composables/usePersonalPage'

export type PersonalPageContext = ReturnType<typeof usePersonalPage>
export const PERSONAL_PAGE_KEY: InjectionKey<PersonalPageContext> = Symbol('personalPage')
