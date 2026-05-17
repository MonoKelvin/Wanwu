import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import 'primeicons/primeicons.css'
import '@app/styles/tokens.css'
import '@app/styles/main.css'
import App from '@app/App.vue'
import router from '@app/router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(PrimeVue, { ripple: false })
app.mount('#app')
