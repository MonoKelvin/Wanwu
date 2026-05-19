import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import { WanwuPreset } from '@app/theme/preset'
import { primeVueZhCn } from '@app/locale/primevue-zh-cn'
import '@app/styles/tokens.css'
import '@app/styles/main.css'
import '@app/styles/settings.css'
import '@app/styles/personal.css'
import '@app/styles/toast.css'
import App from '@app/App.vue'
import router from '@app/router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('tooltip', Tooltip)
app.use(ToastService)
app.use(ConfirmationService)
app.use(PrimeVue, {
  ripple: false,
  locale: primeVueZhCn,
  theme: {
    preset: WanwuPreset,
    options: {
      darkModeSelector: '.p-dark',
      cssLayer: false
    }
  }
})
app.mount('#app')
