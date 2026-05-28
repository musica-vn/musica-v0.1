import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../features/auth/pages/LoginPage.vue'
import LandingPage from '../features/landing/pages/LandingPage.vue'
import { useAuthStore } from '../features/auth/auth.store'
import { pinia } from '../shared/pinia'
import AdminLayout from '../features/admin-shell/layouts/AdminLayout.vue'
import AdminDashboardPage from '../features/admin-shell/pages/AdminDashboardPage.vue'
import AdminListPage from '../features/admin-shell/pages/AdminListPage.vue'
import ProductManagementPage from '../features/admin-shell/pages/ProductManagementPage.vue'
import UserManagementPage from '../features/admin-shell/pages/UserManagementPage.vue'
import CertificateManagementPage from '../features/admin-shell/pages/CertificateManagementPage.vue'
import ComplianceManagementPage from '../features/admin-shell/pages/ComplianceManagementPage.vue'
import CorePermissionSettingsPage from '../features/admin-shell/pages/CorePermissionSettingsPage.vue'
import LicensingConfigManagementPage from '../features/admin-shell/pages/LicensingConfigManagementPage.vue'

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
        { path: 'tracks', redirect: '/admin/products' },
        { path: 'products', component: ProductManagementPage, meta: { title: 'Quản lý sản phẩm' } },
        { path: 'compliance', component: ComplianceManagementPage, meta: { title: 'Pháp lý & kiểm duyệt' } },
        { path: 'settings/permissions', component: CorePermissionSettingsPage, meta: { title: 'Core permissions' } },
        {
          path: 'settings/digital-rights',
          component: LicensingConfigManagementPage,
          props: { resource: 'digital' },
          meta: { title: 'Digital Rights' },
        },
        {
          path: 'settings/physical-rights',
          component: LicensingConfigManagementPage,
          props: { resource: 'physical' },
          meta: { title: 'Physical Rights' },
        },
        {
          path: 'settings/expression-configs',
          component: LicensingConfigManagementPage,
          props: { resource: 'expression' },
          meta: { title: 'Expression Configs' },
        },
        {
          path: 'settings/modification-configs',
          component: LicensingConfigManagementPage,
          props: { resource: 'modification' },
          meta: { title: 'Modification Configs' },
        },
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
