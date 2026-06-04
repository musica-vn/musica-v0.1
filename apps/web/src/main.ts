import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'
import './styles/main.css'
import App from './App.vue'
import { router } from './router'
import { pinia } from './plugins/pinia'
import { initializeAppTheme } from './plugins/app-theme'

const app = createApp(App)

initializeAppTheme()

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
})
app.use(ConfirmationService)

app.mount('#app')
