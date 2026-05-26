import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { pinia } from './shared/pinia'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(PrimeVue, { theme: { preset: Aura } })
app.use(ConfirmationService)

app.mount('#app')
