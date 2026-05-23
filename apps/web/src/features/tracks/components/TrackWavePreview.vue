<script setup lang="ts">
import Button from 'primevue/button'
import WaveSurfer from 'wavesurfer.js'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  audioUrl: string | null
  compact?: boolean
  disabled?: boolean
  rightLabel?: string | null
}>()

const waveformContainer = ref<HTMLElement | null>(null)
const waveSurfer = ref<WaveSurfer | null>(null)
const isReady = ref(false)
const isPlaying = ref(false)
const localError = ref<string | null>(null)

const iconClass = computed(() => (isPlaying.value ? 'pi pi-pause' : 'pi pi-play'))
const rootClass = computed(() =>
  props.compact ? 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2' : 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3',
)
const buttonClass = computed(() =>
  props.compact
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
)
const waveformClass = computed(() => [
  props.compact ? 'min-w-[180px]' : 'min-w-[220px]',
  'w-full rounded-xl',
  Boolean(props.audioUrl) && !isReady.value
    ? 'min-h-[22px] animate-pulse bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800'
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

  const instance = WaveSurfer.create({
    container: waveformContainer.value,
    waveColor: '#c4b5fd',
    progressColor: '#6d4aff',
    cursorColor: '#1f2937',
    barWidth: props.compact ? 2 : 3,
    barGap: props.compact ? 1.5 : 2,
    barRadius: 999,
    height: props.compact ? 44 : 64,
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
        maxLength: props.compact ? 900 : 1400,
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
  () => props.audioUrl,
  async (audioUrl) => {
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
      class="whitespace-nowrap text-[11px] font-medium text-slate-500 [font-variant-numeric:tabular-nums] dark:text-slate-400"
    >
      {{ rightLabel }}
    </span>
    <div v-if="localError" class="col-span-full text-xs text-red-600 dark:text-red-400">{{ localError }}</div>
  </div>
</template>
