<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { ApiClientError } from '../../../shared/api/http'
import { useAuthStore } from '../../auth/auth.store'
import {
  createCreatorDigitalRightRegistration,
  createCreatorPhysicalRightRegistration,
  listCreatorProducts,
  removeCreatorDigitalRightRegistration,
  removeCreatorPhysicalRightRegistration,
} from '../../products/products.api'
import type { Product, ProductLicensingEligibilityConfig } from '../../products/products.types'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const actionTarget = ref<string | null>(null)
const products = ref<Product[]>([])
const selectedProductId = ref<string | null>(null)

const selectedProduct = computed(
  () => products.value.find((item) => item.id === selectedProductId.value) ?? products.value[0] ?? null,
)

const setError = (error: unknown) => {
  if (error instanceof ApiClientError) {
    errorMessage.value = error.message
    return
  }

  errorMessage.value = error instanceof Error ? error.message : 'Đã xảy ra lỗi'
}

const clearMessages = () => {
  errorMessage.value = null
  successMessage.value = null
}

const loadProducts = async () => {
  clearMessages()
  isLoading.value = true

  try {
    const { data } = await listCreatorProducts()
    products.value = data.items
    if (!selectedProductId.value && data.items.length > 0) {
      selectedProductId.value = data.items[0].id
    }
  } catch (error) {
    setError(error)
  } finally {
    isLoading.value = false
  }
}

const formatEligibilityStatusLabel = (status: ProductLicensingEligibilityConfig['status']) =>
  status === 'ELIGIBLE' ? 'Đủ điều kiện' : 'Không đủ điều kiện'

const canJoinPackage = (config: ProductLicensingEligibilityConfig) =>
  config.status === 'ELIGIBLE' && config.registrationStatus === 'NOT_JOINED'

const isPackageBusy = (productId: string, configId: string) =>
  actionTarget.value === `${productId}:${configId}`

const submitPackageAction = async (
  product: Product,
  config: ProductLicensingEligibilityConfig,
) => {
  actionTarget.value = `${product.id}:${config.configId}`
  clearMessages()

  try {
    if (config.configType === 'DIGITAL') {
      if (config.registrationStatus === 'JOINED' && config.registrationId) {
        await removeCreatorDigitalRightRegistration(product.id, config.registrationId)
        successMessage.value = `Đã gỡ sản phẩm khỏi gói ${config.title}`
      } else {
        await createCreatorDigitalRightRegistration(product.id, { configId: config.configId })
        successMessage.value = `Đã đăng ký sản phẩm vào gói ${config.title}`
      }
    } else if (config.registrationStatus === 'JOINED' && config.registrationId) {
      await removeCreatorPhysicalRightRegistration(product.id, config.registrationId)
      successMessage.value = `Đã gỡ sản phẩm khỏi gói ${config.title}`
    } else {
      await createCreatorPhysicalRightRegistration(product.id, { configId: config.configId })
      successMessage.value = `Đã đăng ký sản phẩm vào gói ${config.title}`
    }

    await loadProducts()
  } catch (error) {
    setError(error)
  } finally {
    actionTarget.value = null
  }
}

const logout = async () => {
  authStore.logout()
  await router.replace('/login')
}

onMounted(() => {
  void loadProducts()
})
</script>

<template>
  <div class="page">
    <header class="header">
      <div>
        <h1 class="title">Đăng ký bán theo gói</h1>
        <div class="subtitle">Quản lý các gói Digital / Physical mà sản phẩm của bạn có thể tham gia.</div>
      </div>
      <div class="header-actions">
        <Button label="Làm mới" severity="secondary" :loading="isLoading" @click="loadProducts" />
        <Button label="Đăng xuất" severity="secondary" @click="logout" />
      </div>
    </header>

    <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
    <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>

    <Card>
      <template #title>Tài khoản hiện tại</template>
      <template #content>
        <div class="grid">
          <div><b>Email:</b> {{ authStore.user?.email }}</div>
          <div><b>Name:</b> {{ authStore.user?.fullName }}</div>
          <div class="roles">
            <Tag v-if="authStore.user?.roleName" :value="authStore.user.roleName" />
          </div>
        </div>
      </template>
    </Card>

    <section class="layout">
      <Card>
        <template #title>Sản phẩm của tôi</template>
        <template #content>
          <div v-if="products.length === 0" class="hint">Chưa có sản phẩm nào thuộc tài khoản này.</div>
          <div v-else class="product-list">
            <button
              v-for="product in products"
              :key="product.id"
              type="button"
              class="product-item"
              :class="{ active: product.id === selectedProduct?.id }"
              @click="selectedProductId = product.id"
            >
              <div class="product-item-title">{{ product.title }}</div>
              <div class="product-item-meta">
                {{ product.licensingEligibility.summary.joinedDigitalCount }} digital joined ·
                {{ product.licensingEligibility.summary.joinedPhysicalCount }} physical joined
              </div>
            </button>
          </div>
        </template>
      </Card>

      <Card v-if="selectedProduct">
        <template #title>{{ selectedProduct.title }}</template>
        <template #content>
          <div class="grid">
            <div><b>Trạng thái:</b> {{ selectedProduct.status }}</div>
            <div><b>Genre:</b> {{ selectedProduct.genre || 'Chưa cập nhật' }}</div>
            <div><b>Use-case:</b> {{ selectedProduct.useCase || 'Chưa cập nhật' }}</div>
          </div>

          <div class="section">
            <h3>Digital Packages</h3>
            <div v-if="selectedProduct.licensingEligibility.digitalConfigs.length === 0" class="hint">
              Chưa có gói digital đang hoạt động.
            </div>
            <div v-else class="package-list">
              <article
                v-for="config in selectedProduct.licensingEligibility.digitalConfigs"
                :key="`${selectedProduct.id}-digital-${config.configId}`"
                class="package-card"
              >
                <div class="package-header">
                  <div>
                    <div class="package-title">{{ config.title }}</div>
                    <div class="package-meta">{{ config.referencedPermissions.length }} quyền tham chiếu</div>
                  </div>
                  <div class="roles">
                    <Tag :value="formatEligibilityStatusLabel(config.status)" :severity="config.status === 'ELIGIBLE' ? 'success' : 'danger'" />
                    <Tag :value="config.registrationStatus === 'JOINED' ? 'Đã đăng ký' : 'Chưa đăng ký'" severity="info" />
                  </div>
                </div>
                <div v-if="config.missingPermissions.length > 0" class="hint">
                  Thiếu quyền: {{ config.missingPermissions.map((permission) => permission.name).join(', ') }}
                </div>
                <div class="package-actions">
                  <Button
                    :label="config.registrationStatus === 'JOINED' ? 'Gỡ khỏi gói' : 'Đăng ký tham gia'"
                    :disabled="!canJoinPackage(config) && config.registrationStatus !== 'JOINED'"
                    :loading="isPackageBusy(selectedProduct.id, config.configId)"
                    @click="submitPackageAction(selectedProduct, config)"
                  />
                </div>
              </article>
            </div>
          </div>

          <div class="section">
            <h3>Physical Packages</h3>
            <div v-if="selectedProduct.licensingEligibility.physicalConfigs.length === 0" class="hint">
              Chưa có gói physical đang hoạt động.
            </div>
            <div v-else class="package-list">
              <article
                v-for="config in selectedProduct.licensingEligibility.physicalConfigs"
                :key="`${selectedProduct.id}-physical-${config.configId}`"
                class="package-card"
              >
                <div class="package-header">
                  <div>
                    <div class="package-title">{{ config.title }}</div>
                    <div class="package-meta">{{ config.referencedPermissions.length }} quyền tham chiếu</div>
                  </div>
                  <div class="roles">
                    <Tag :value="formatEligibilityStatusLabel(config.status)" :severity="config.status === 'ELIGIBLE' ? 'success' : 'danger'" />
                    <Tag :value="config.registrationStatus === 'JOINED' ? 'Đã đăng ký' : 'Chưa đăng ký'" severity="info" />
                  </div>
                </div>
                <div v-if="config.missingPermissions.length > 0" class="hint">
                  Thiếu quyền: {{ config.missingPermissions.map((permission) => permission.name).join(', ') }}
                </div>
                <div class="package-actions">
                  <Button
                    :label="config.registrationStatus === 'JOINED' ? 'Gỡ khỏi gói' : 'Đăng ký tham gia'"
                    :disabled="!canJoinPackage(config) && config.registrationStatus !== 'JOINED'"
                    :loading="isPackageBusy(selectedProduct.id, config.configId)"
                    @click="submitPackageAction(selectedProduct, config)"
                  />
                </div>
              </article>
            </div>
          </div>
        </template>
      </Card>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
  display: grid;
  gap: 16px;
  text-align: left;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.title {
  margin: 0;
}

.subtitle,
.hint,
.product-item-meta,
.package-meta {
  opacity: 0.8;
}

.grid {
  display: grid;
  gap: 10px;
}

.roles {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 16px;
}

.product-list,
.package-list {
  display: grid;
  gap: 12px;
}

.product-item {
  width: 100%;
  border: 1px solid #dbe0ea;
  border-radius: 16px;
  padding: 12px 14px;
  background: #fff;
  text-align: left;
}

.product-item.active {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
}

.product-item-title,
.package-title {
  font-weight: 600;
}

.section {
  margin-top: 20px;
  display: grid;
  gap: 12px;
}

.package-card {
  border: 1px solid #dbe0ea;
  border-radius: 18px;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.package-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.package-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
  }
}
</style>
