import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/auth/LoginView.vue'
import DashboardView from '../views/dashboard/DashboardView.vue'
import { useAuthStore } from '../stores/auth.store'
import { pinia } from '../plugins/pinia'
import MainLayout from '../layouts/MainLayout.vue'
import AdminDashboardView from '../views/admin/AdminDashboardView.vue'
import AdminListView from '../views/admin/AdminListView.vue'
import ProductListView from '../views/admin/ProductListView.vue'
import ProductDetailView from '../views/admin/ProductDetailView.vue'
import UserManagementView from '../views/admin/UserManagementView.vue'
import CertificateManagementView from '../views/admin/CertificateManagementView.vue'
import ComplianceManagementView from '../views/admin/ComplianceManagementView.vue'
import CorePermissionSettingsView from '../views/admin/CorePermissionSettingsView.vue'
import LicensingConfigManagementView from '../views/admin/LicensingConfigManagementView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/landing', name: 'landing', component: DashboardView },
    {
      path: '/admin',
      component: MainLayout,
      meta: { requiresAdmin: true },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', component: AdminDashboardView, meta: { title: 'Bảng điều khiển' } },
        {
          path: 'admins',
          component: AdminListView,
          meta: { title: 'Quản trị viên', requiresSuperAdmin: true },
        },
        { path: 'tracks', redirect: '/admin/products' },
        { path: 'products', component: ProductListView, meta: { title: 'Quản lý sản phẩm' } },
        {
          path: 'products/:productId/:section?',
          redirect: (to) => ({
            path: `/products/${String(to.params.productId)}/${typeof to.params.section === 'string' ? to.params.section : 'general'}`,
            query: to.query,
          }),
        },
        { path: 'compliance', component: ComplianceManagementView, meta: { title: 'Kiểm duyệt & Pháp lý' } },
        { path: 'settings/permissions', component: CorePermissionSettingsView, meta: { title: 'Quyền cốt lõi' } },
        {
          path: 'settings/digital-rights',
          component: LicensingConfigManagementView,
          props: { resource: 'digital' },
          meta: { title: 'Quản lý nền tảng số' },
        },
        {
          path: 'settings/physical-rights',
          component: LicensingConfigManagementView,
          props: { resource: 'physical' },
          meta: { title: 'Quyền sử dụng vật lý' },
        },
        {
          path: 'settings/expression-configs',
          component: LicensingConfigManagementView,
          props: { resource: 'expression' },
          meta: { title: 'Cấu hình biểu hiện' },
        },
        {
          path: 'settings/modification-configs',
          component: LicensingConfigManagementView,
          props: { resource: 'modification' },
          meta: { title: 'Cấu hình biến đổi' },
        },
        {
          path: 'users/buyers',
          component: UserManagementView,
          props: { initialRole: 'BUYER' },
          meta: { title: 'Quản lý người mua' },
        },
        {
          path: 'users/artists',
          component: UserManagementView,
          props: { initialRole: 'ARTIST' },
          meta: { title: 'Quản lý nghệ sĩ' },
        },
        {
          path: 'certificates',
          component: CertificateManagementView,
          meta: { title: 'Quản lý chứng chỉ' },
        },
      ],
    },
    {
      path: '/products/:productId/:section?',
      component: ProductDetailView,
      meta: { requiresAdmin: true, title: 'Workspace sản phẩm' },
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
