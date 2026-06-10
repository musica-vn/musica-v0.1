<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'

import AdminButton from '../../shared/admin/AdminButton.vue'

import {
  PRODUCT_GENRE_OPTIONS,
  PRODUCT_USE_CASE_OPTIONS,
  type ProductGenre,
  type ProductUseCase,
} from '../../../constants/products.enums'

type ProductForm = {
  title: string
  artistId: string
  genres: ProductGenre[]
  useCases: ProductUseCase[]
  description: string
  duration: string
}

type ArtistOption = {
  value: string
  label: string
  email: string
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    mode: 'create' | 'edit'
    isLoading: boolean
    isArtistsLoading: boolean
    artistOptions: ArtistOption[]
    errorMessage: string | null
    form: ProductForm
    fieldClass: string
    selectFieldClass: string
    fileInputClass: string
    durationDisplay: string | null
    audioUrl: string | null
    thumbnailUrl: string | null
    audioFile: File | null
    thumbnailFile: File | null
    sheetMusicFile: File | null
    canOpenSheetMusicPdf?: boolean
  }>(),
  {
    canOpenSheetMusicPdf: false,
  },
)

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  submit: []
  close: []
  thumbnailChange: [event: Event]
  audioChange: [event: Event]
  sheetMusicChange: [event: Event]
  openSheetMusicPdf: []
}>()

const close = () => {
  emit('update:visible', false)
  emit('close')
}

const toggleSelection = <TValue extends string>(current: TValue[], value: TValue) =>
  current.includes(value) ? current.filter((item) => item !== value) : [...current, value]

const resolveSelectedArtistEmail = () =>
  props.artistOptions.find((option) => option.value === props.form.artistId)?.email ?? null
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    class="w-[calc(100vw-0.75rem)] sm:w-[min(1040px,96vw)]"
    :pt="{ content: { class: 'max-h-[calc(100svh-0.75rem)] overflow-y-auto sm:max-h-[calc(100svh-8rem)]' } }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="flex w-full items-center justify-between gap-4">
        <div>
          <div class="text-lg font-semibold text-[color:var(--admin-text)]">
            {{ props.mode === 'create' ? 'Thêm track' : 'Chỉnh sửa track' }}
          </div>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-500)]">
          <i :class="props.mode === 'create' ? 'pi pi-wave-pulse' : 'pi pi-pencil'" />
        </div>
      </div>
    </template>

    <Message v-if="props.errorMessage" severity="error" class="mb-4">{{ props.errorMessage }}</Message>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <section class="space-y-4 rounded-[28px] border bg-[color:var(--admin-surface-1)] p-4 sm:p-5 [border-color:var(--admin-border)]">
        <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
          <i class="pi pi-align-left text-[color:var(--admin-primary-500)]" />
          Thông tin chung
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Tên track</span>
            <input v-model="props.form.title" :class="props.fieldClass" placeholder="Nhập tên track" />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Nghệ sĩ</span>
            <div class="relative">
              <select v-model="props.form.artistId" :class="props.selectFieldClass" :disabled="props.isArtistsLoading">
                <option value="">Chọn nghệ sĩ</option>
                <option v-for="artist in props.artistOptions" :key="artist.value" :value="artist.value">
                  {{ artist.label }}
                </option>
              </select>
              <i class="pi pi-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[color:var(--admin-text-muted)]" />
            </div>
            <span class="text-xs text-[color:var(--admin-text-muted)]">
              {{ props.isArtistsLoading ? 'Đang tải danh sách nghệ sĩ...' : resolveSelectedArtistEmail() || 'Chọn nghệ sĩ active để gắn cho sản phẩm' }}
            </span>
          </label>

          <div class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Thể loại</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="option in PRODUCT_GENRE_OPTIONS"
                :key="`${props.mode}-genre-${option.value}`"
                type="button"
                class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                :class="props.form.genres.includes(option.value)
                  ? 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-text)] [border-color:var(--admin-primary-500)]'
                  : 'bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-2)]'"
                @click="props.form.genres = toggleSelection(props.form.genres, option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Use-case</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="option in PRODUCT_USE_CASE_OPTIONS"
                :key="`${props.mode}-usecase-${option.value}`"
                type="button"
                class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                :class="props.form.useCases.includes(option.value)
                  ? 'bg-[color:var(--admin-primary-50)] text-[color:var(--admin-text)] [border-color:var(--admin-primary-500)]'
                  : 'bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text)] [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-2)]'"
                @click="props.form.useCases = toggleSelection(props.form.useCases, option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <label class="space-y-2 sm:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Mô tả sản phẩm</span>
            <textarea
              v-model="props.form.description"
              class="min-h-[120px] w-full rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-3 text-sm text-[color:var(--admin-text)] shadow-sm outline-none transition placeholder:text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] focus:[border-color:var(--admin-primary-500)] focus:ring-4 focus:ring-[color:var(--admin-ring)]"
              placeholder="Nhập mô tả chi tiết cho sản phẩm"
            />
          </label>
        </div>
      </section>

      <section class="space-y-4 rounded-[28px] border bg-[color:var(--admin-surface-1)] p-4 sm:p-5 [border-color:var(--admin-border)]">
        <div class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
          <i class="pi pi-image text-[color:var(--admin-primary-500)]" />
          Thumbnail
        </div>

        <article class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 shadow-sm [border-color:var(--admin-border)]">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold text-[color:var(--admin-text)]">Ảnh đại diện</div>
            <span v-if="props.thumbnailFile" class="rounded-full bg-[color:var(--admin-primary-50)] px-3 py-1 text-xs font-medium text-[color:var(--admin-text)]">
              {{ props.thumbnailFile.name }}
            </span>
          </div>
          <div class="mt-4">
            <input type="file" accept="image/*,.png,.jpg,.jpeg,.webp" :class="props.fileInputClass" @change="emit('thumbnailChange', $event)" />
          </div>
          <div class="mt-4 overflow-hidden rounded-2xl border border-dashed bg-[color:var(--admin-surface-1)] p-4 [border-color:var(--admin-border)]">
            <img v-if="props.thumbnailUrl" :src="props.thumbnailUrl" alt="" class="h-40 w-full rounded-2xl object-cover" />
            <div v-else class="flex h-40 items-center justify-center text-sm text-[color:var(--admin-text-muted)]">Chưa chọn thumbnail</div>
          </div>
        </article>

        <div class="flex items-center gap-3 pt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
          <i class="pi pi-volume-up text-[color:var(--admin-primary-500)]" />
          Audio gốc
        </div>

        <article class="mt-4 rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 shadow-sm [border-color:var(--admin-border)]">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold text-[color:var(--admin-text)]">File MP3 gốc</div>
            <span v-if="props.audioFile" class="rounded-full bg-[color:var(--admin-primary-50)] px-3 py-1 text-xs font-medium text-[color:var(--admin-text)]">
              {{ props.audioFile.name }}
            </span>
          </div>
          <div class="mt-4">
            <input type="file" accept=".mp3,audio/*" :class="props.fileInputClass" @change="emit('audioChange', $event)" />
          </div>
          <div class="mt-4">
            <slot name="wavePreview" :audio-url="props.audioUrl" />
          </div>
        </article>

        <div class="flex items-center gap-3 pt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-text-muted)]">
          <i class="pi pi-file-pdf text-[color:var(--admin-primary-500)]" />
          Khuông nhạc (PDF)
        </div>

        <article class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 shadow-sm [border-color:var(--admin-border)]">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold text-[color:var(--admin-text)]">File PDF</div>
            <span v-if="props.sheetMusicFile" class="rounded-full bg-[color:var(--admin-primary-50)] px-3 py-1 text-xs font-medium text-[color:var(--admin-text)]">
              {{ props.sheetMusicFile.name }}
            </span>
          </div>
          <div class="mt-4">
            <input type="file" accept=".pdf,application/pdf" :class="props.fileInputClass" @change="emit('sheetMusicChange', $event)" />
          </div>
          <div v-if="props.mode === 'edit'" class="mt-4">
            <AdminButton class="w-full sm:w-auto" :disabled="!props.canOpenSheetMusicPdf" @click="emit('openSheetMusicPdf')">
              Mở PDF
            </AdminButton>
          </div>
        </article>

        <label class="mt-4 block space-y-2">
          <span class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]">Thời lượng (giây)</span>
          <input v-model="props.form.duration" :class="props.fieldClass" readonly />
          <span class="text-xs text-[color:var(--admin-text-muted)]">
            {{ props.durationDisplay ? `≈ ${props.durationDisplay}` : 'Chọn file audio để tự đọc thời lượng.' }}
          </span>
        </label>
      </section>
    </div>

    <template #footer>
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
        <AdminButton class="w-full sm:w-auto" @click="close">
          Huỷ
        </AdminButton>
        <AdminButton variant="primary" class="w-full sm:w-auto" :loading="props.isLoading" @click="emit('submit')">
          {{ props.mode === 'create' ? 'Tạo track' : 'Lưu thay đổi' }}
        </AdminButton>
      </div>
    </template>
  </Dialog>
</template>
