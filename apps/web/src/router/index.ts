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
import UserManagementPage from '../views/admin/UserManagementPage.vue'
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
        { path: 'dashboard', component: AdminDashboardPage, meta: { title: 'Dashboard' } },
        {
          path: 'admins',
          component: AdminListPage,
          meta: { title: 'Admin List', requiresSuperAdmin: true },
        },
        { path: 'tracks', component: TrackManagementPage, meta: { title: 'Track Management' } },
        {
          path: 'users/buyers',
          component: UserManagementPage,
          props: { initialRole: 'BUYER' },
          meta: { title: 'User Management - Buyers' },
        },
        {
          path: 'users/artists',
          component: UserManagementPage,
          props: { initialRole: 'ARTIST' },
          meta: { title: 'User Management - Artists' },
        },
        { path: 'certificates', component: CertificateManagementPage, meta: { title: 'Certificate Management' } },
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

  if (to.meta.requiresSuperAdmin) {
    if (!authStore.isAuthenticated) return '/login'
    if (!authStore.isSuperAdmin) return '/landing'
  }

  if (to.name === 'landing' && !authStore.isAuthenticated) {
    return '/login'
  }

  return true
})
