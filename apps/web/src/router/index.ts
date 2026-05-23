import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import ExamplesPage from '../views/ExamplesPage.vue'
import LoginPage from '../views/LoginPage.vue'
import LandingTestPage from '../views/LandingTestPage.vue'
import { useAuthStore } from '../features/auth/auth.store'
import { pinia } from '../shared/pinia'
import AdminLayout from '../views/admin/AdminLayout.vue'
import AdminDashboardPage from '../views/admin/AdminDashboardPage.vue'
import AdminListPage from '../views/admin/AdminListPage.vue'
import TrackManagementPage from '../views/admin/TrackManagementPage.vue'
import BuyerManagementPage from '../views/admin/BuyerManagementPage.vue'
import ArtistManagementPage from '../views/admin/ArtistManagementPage.vue'
import CertificateManagementPage from '../views/admin/CertificateManagementPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/examples', name: 'examples', component: ExamplesPage },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/landing', name: 'landing', component: LandingTestPage },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAdmin: true },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', component: AdminDashboardPage, meta: { title: 'Tổng quan' } },
        { path: 'admins', component: AdminListPage, meta: { title: 'Danh sách admin' } },
        { path: 'tracks', component: TrackManagementPage, meta: { title: 'Quản lý track' } },
        { path: 'users/buyers', component: BuyerManagementPage, meta: { title: 'Quản lý người mua' } },
        { path: 'users/artists', component: ArtistManagementPage, meta: { title: 'Quản lý nghệ sĩ' } },
        { path: 'certificates', component: CertificateManagementPage, meta: { title: 'Quản lý chứng chỉ' } },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore(pinia)

  if (to.name === 'login' && authStore.isAuthenticated) {
    return authStore.isAdmin ? '/admin' : '/landing'
  }

  if (to.meta.requiresAdmin) {
    if (!authStore.isAuthenticated) return '/login'
    if (!authStore.isAdmin) return '/landing'
  }

  if (to.name === 'landing' && !authStore.isAuthenticated) {
    return '/login'
  }

  return true
})
