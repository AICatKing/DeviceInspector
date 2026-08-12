import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DeviceListView from '../views/DeviceListView.vue'
import DeviceDetailView from '../views/DeviceDetailView.vue'
import InspectionFormView from '../views/InspectionFormView.vue'
import InspectionHistoryView from '../views/InspectionHistoryView.vue'
import InspectionDetailView from '../views/InspectionDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/devices',
      name: 'device-list',
      component: DeviceListView,
    },
    {
      path: '/devices/:id',
      name: 'device-detail',
      component: DeviceDetailView,
      props: true,
    },
    {
      path: '/devices/:id/inspect',
      name: 'inspection-create',
      component: InspectionFormView,
      props: true,
    },
    {
      path: '/inspections',
      name: 'inspection-history',
      component: InspectionHistoryView,
    },
    {
      path: '/inspections/:id',
      name: 'inspection-detail',
      component: InspectionDetailView,
      props: true,
    },
  ],
})

export default router
