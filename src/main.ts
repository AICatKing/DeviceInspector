import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useInspectionStore } from './stores/inspectionStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(router)

const inspectionStore = useInspectionStore(pinia)
void inspectionStore.initialize()

app.mount('#app')
