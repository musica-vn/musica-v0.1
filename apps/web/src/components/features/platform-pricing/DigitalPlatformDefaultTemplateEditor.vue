<script setup lang="ts">
import Message from 'primevue/message'
import { onMounted, ref } from 'vue'
import { ApiClientError } from '../../../api/axios'
import {
  getAdminDigitalPlatformDefaultTemplate,
  updateAdminDigitalPlatformDefaultTemplate,
} from '../../../services/licensing-configs.service'
import type { DigitalPlatformDefaultTemplate } from '../../../types/licensing-configs.types'
import type { PlatformPricingModifierValue } from '../../../constants/platform-pricing'
import {
  buildCompletePlatformPricingModifiers,
  sortPlatformPricingModifiers,
} from '../../../constants/platform-pricing'
import PlatformPricingModifierEditor from './PlatformPricingModifierEditor.vue'

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-[color:var(--admin-primary-button-bg)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-primary-button-text)] transition hover:bg-[color:var(--admin-primary-button-hover)] active:bg-[color:var(--admin-primary-button-active)] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-2.5 text-sm font-semibold text-[color:var(--admin-text)] transition [border-color:var(--admin-border)] hover:border-[color:rgb(var(--admin-primary-rgb)/0.24)] hover:text-[color:var(--admin-primary-700)] disabled:cursor-not-allowed disabled:opacity-60'

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const template = ref<DigitalPlatformDefaultTemplate | null>(null)
const modifiers = ref<PlatformPricingModifierValue[]>([])

const loadTemplate = async () => {
  isLoading.value = true
  errorMessage.value = null

  try {
    const { data } = await getAdminDigitalPlatformDefaultTemplate()
    template.value = data
    modifiers.value = buildCompletePlatformPricingModifiers(data.modifiers)
  } catch (error) {
    errorMessage.value =
      error instanceof ApiClientError ? error.message : 'Không thể tải mẫu giá mặc định của YouTube'
  } finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  modifiers.value = buildCompletePlatformPricingModifiers(template.value?.modifiers ?? [])
  successMessage.value = null
  errorMessage.value = null
}

const saveTemplate = async () => {
  isSaving.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const { data } = await updateAdminDigitalPlatformDefaultTemplate({
      modifiers: sortPlatformPricingModifiers(modifiers.value),
    })
    template.value = data
    modifiers.value = buildCompletePlatformPricingModifiers(data.modifiers)
    successMessage.value = 'Đã cập nhật mẫu giá mặc định của YouTube.'
  } catch (error) {
    errorMessage.value =
      error instanceof ApiClientError ? error.message : 'Không thể cập nhật mẫu giá mặc định của YouTube'
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  void loadTemplate()
})
</script>

<template>
  <section class="space-y-5">
    <div class="rounded-[28px] border bg-[color:var(--admin-surface-0)] p-5 [border-color:var(--admin-border)]">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
            Quản lý nền tảng số
          </div>
          <div class="mt-2 text-2xl font-semibold text-[color:var(--admin-text)]">
            Mẫu giá mặc định của YouTube
          </div>
          <div class="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--admin-text-muted)]">
            YouTube dùng một bộ dữ liệu mặc định cố định với đầy đủ thuộc tính giá. Admin chỉ sửa hệ số giá của từng thuộc tính, không tạo thêm config nền tảng mới.
          </div>
        </div>

        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button type="button" :class="[secondaryButtonClass, 'w-full sm:w-auto']" :disabled="isLoading || isSaving" @click="resetForm">
            Khôi phục dữ liệu đang tải
          </button>
          <button type="button" :class="[primaryButtonClass, 'w-full sm:w-auto']" :disabled="isLoading || isSaving || !template" @click="saveTemplate">
            {{ isSaving ? 'Đang lưu...' : 'Lưu mẫu giá mặc định' }}
          </button>
        </div>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
    <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
    <Message v-if="isLoading" severity="info">Đang tải mẫu giá mặc định của YouTube...</Message>

    <div v-if="template" class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-4">
        <PlatformPricingModifierEditor v-model="modifiers" :disabled="isLoading || isSaving" />
      </div>

      <aside class="rounded-[24px] border bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]">
        <div class="rounded-[22px] border bg-[linear-gradient(135deg,var(--admin-primary-50),var(--admin-accent-50))] p-4 [border-color:rgb(var(--admin-primary-rgb)/0.12)]">
          <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-primary-800)]">
            Nền tảng mặc định
          </div>
          <div class="mt-2 text-base font-semibold text-[color:var(--admin-text)]">
            {{ template.platformLabel }}
          </div>
        </div>

        <div class="mt-4 space-y-3 rounded-[22px] border bg-[color:var(--admin-surface-0)] p-4 [border-color:var(--admin-border)]">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
            Tóm tắt
          </div>

          <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
              Tên mẫu
            </div>
            <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
              {{ template.name }}
            </div>
          </div>

          <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
              Số thuộc tính giá
            </div>
            <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
              {{ modifiers.length }} thuộc tính
            </div>
          </div>

          <div class="rounded-2xl bg-[color:var(--admin-surface-1)] px-4 py-4">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">
              Cập nhật gần nhất
            </div>
            <div class="mt-2 text-sm font-semibold text-[color:var(--admin-text)]">
              {{ template.updatedAt ?? 'Chưa có dữ liệu' }}
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
