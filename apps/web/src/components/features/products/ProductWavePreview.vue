<script setup lang="ts">
import Button from 'primevue/button'
import WaveSurfer from 'wavesurfer.js'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  audioUrl: string | null
  compact?: boolean
  disabled?: boolean
  rightLabel?: string | null
  trackStatus?: 'PUBLISHED' | 'PENDING' | 'HIDDEN'
}>()

const waveformContainer = ref<HTMLElement | null>(null)
const waveSurfer = ref<WaveSurfer | null>(null)
const isReady = ref(false)
const isPlaying = ref(false)
const localError = ref<string | null>(null)

const getCssVarColor = (variableName: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
  return value.length > 0 ? value : fallback
}

const iconClass = computed(() => (isPlaying.value ? 'pi pi-pause' : 'pi pi-play'))
const resolvedWaveColor = computed(() => {
  if (props.trackStatus === 'PUBLISHED') return getCssVarColor('--admin-success-500', '#50B070')
  if (props.trackStatus === 'HIDDEN') return getCssVarColor('--admin-neutral-200', '#CBD5E1')
  return getCssVarColor('--admin-accent-400', '#5F9FE2')
})
const rootClass = computed(() =>
  props.compact
    ? 'grid grid-cols-[2.75rem_minmax(0,1fr)_3.25rem] items-center gap-2'
    : 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3',
)
const buttonClass = computed(() =>
  props.compact
    ? 'inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:cursor-not-allowed disabled:opacity-50'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition [border-color:var(--admin-border)] hover:bg-[color:var(--admin-surface-1)] disabled:cursor-not-allowed disabled:opacity-50',
)
const waveformClass = computed(() => [
  'min-w-0 w-full rounded-xl',
  Boolean(props.audioUrl) && !isReady.value
    ? 'min-h-[22px] animate-pulse bg-[color:var(--admin-surface-1)]'
    : '',
])

type PeaksCacheValue = {
  peaks: Array<number[]>
  duration: number
}

const peaksCache = new Map<string, PeaksCacheValue>()
const peaksLoading = new Map<string, Promise<PeaksCacheValue>>()

const destroyWaveSurfer = () => {
  waveSurfer.value?.destroy()
  waveSurfer.value = null
  isReady.value = false
  isPlaying.value = false
}

const waitForReady = (instance: WaveSurfer) =>
  new Promise<void>((resolve) => {
    instance.once('ready', () => resolve())
  })

const initializeWaveSurfer = async (audioUrl: string) => {
  destroyWaveSurfer()
  localError.value = null

  await nextTick()
  if (!waveformContainer.value) return

  const activeColor = getCssVarColor('--admin-accent-500', '#378ADD')
  const cursorColor = getCssVarColor('--admin-border-strong', '#64748B')
  const waveColor = resolvedWaveColor.value

  const instance = WaveSurfer.create({
    container: waveformContainer.value,
    waveColor,
    progressColor: activeColor,
    cursorColor,
    cursorWidth: 2,
    barWidth: props.compact ? 1.5 : 3,
    barGap: props.compact ? 1 : 2,
    barRadius: 999,
    height: props.compact ? 64 : 72,
    normalize: true,
    dragToSeek: true,
  })

  instance.on('ready', () => {
    isReady.value = true
  })
  instance.on('play', () => {
    isPlaying.value = true
  })
  instance.on('pause', () => {
    isPlaying.value = false
  })
  instance.on('finish', () => {
    isPlaying.value = false
  })
  instance.on('error', (error) => {
    localError.value = error instanceof Error ? error.message : String(error)
  })

  waveSurfer.value = instance

  const cached = peaksCache.get(audioUrl)
  if (cached) {
    await instance.load(audioUrl, cached.peaks, cached.duration)
    return
  }

  const inflight = peaksLoading.get(audioUrl)
  if (inflight) {
    const result = await inflight
    await instance.load(audioUrl, result.peaks, result.duration)
    return
  }

  const loadingPromise = (async () => {
    await instance.load(audioUrl)
    await waitForReady(instance)

    const result = {
      peaks: instance.exportPeaks({
        channels: 1,
        maxLength: props.compact ? 3200 : 2600,
        precision: 2,
      }),
      duration: instance.getDuration(),
    }
    peaksCache.set(audioUrl, result)
    return result
  })().finally(() => {
    peaksLoading.delete(audioUrl)
  })

  peaksLoading.set(audioUrl, loadingPromise)
  await loadingPromise
}

const togglePlayback = async () => {
  if (props.disabled || !waveSurfer.value || !isReady.value) return
  await waveSurfer.value.playPause()
}

watch(
  () => [props.audioUrl, props.trackStatus] as const,
  async ([audioUrl]) => {
    if (!audioUrl) {
      destroyWaveSurfer()
      return
    }

    await initializeWaveSurfer(audioUrl)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  destroyWaveSurfer()
})
</script>

<template>
  <div :class="rootClass">
    <Button rounded text severity="secondary" :class="buttonClass" :icon="iconClass" :disabled="disabled || !audioUrl || !isReady" @click="togglePlayback" />
    <div ref="waveformContainer" :class="waveformClass" />
    <span
      v-if="rightLabel"
      class="whitespace-nowrap text-[11px] font-medium text-[color:var(--admin-text-muted)] [font-variant-numeric:tabular-nums]"
    >
      {{ rightLabel }}
    </span>
    <div v-if="localError" class="col-span-full text-xs text-[color:var(--admin-text)]">{{ localError }}</div>
  </div>
</template>
