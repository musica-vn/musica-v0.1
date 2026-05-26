import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../features/auth/pages/LoginPage.vue'
import LandingPage from '../features/landing/pages/LandingPage.vue'
import { useAuthStore } from '../features/auth/auth.store'
import { pinia } from '../shared/pinia'
import AdminLayout from '../features/admin-shell/layouts/AdminLayout.vue'
import AdminDashboardPage from '../features/admin-shell/pages/AdminDashboardPage.vue'
import AdminListPage from '../features/admin-shell/pages/AdminListPage.vue'
import TrackManagementPage from '../features/admin-shell/pages/TrackManagementPage.vue'
import UserManagementPage from '../features/admin-shell/pages/UserManagementPage.vue'
import CertificateManagementPage from '../features/admin-shell/pages/CertificateManagementPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/landing', name: 'landing', component: LandingPage },
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
        { path: 'tracks', component: TrackManagementPage, meta: { title: 'Quản lý Track' } },
        {
          path: 'users/buyers',
          component: UserManagementPage,
          props: { initialRole: 'BUYER' },
          meta: { title: 'User Management · Buyers' },
        },
        {
          path: 'users/artists',
          component: UserManagementPage,
          props: { initialRole: 'ARTIST' },
          meta: { title: 'User Management · Artists' },
        },
        {
          path: 'certificates',
          component: CertificateManagementPage,
          meta: { title: 'Quản lý Certificate' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
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
