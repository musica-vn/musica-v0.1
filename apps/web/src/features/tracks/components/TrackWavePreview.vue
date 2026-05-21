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
  <div class="wave-preview" :class="{ 'wave-preview--compact': compact }">
    <Button
      rounded
      text
      severity="secondary"
      class="wave-preview__button"
      :icon="iconClass"
      :disabled="disabled || !audioUrl || !isReady"
      @click="togglePlayback"
    />
    <div
      ref="waveformContainer"
      class="wave-preview__waveform"
      :class="{ 'wave-preview__waveform--loading': Boolean(audioUrl) && !isReady }"
    />
    <span v-if="rightLabel" class="wave-preview__label">{{ rightLabel }}</span>
    <div v-if="localError" class="wave-preview__error">{{ localError }}</div>
  </div>
</template>

<style scoped>
.wave-preview {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.wave-preview--compact {
  gap: 8px;
}

.wave-preview__button {
  width: 38px;
  height: 38px;
}

.wave-preview__waveform {
  min-width: 180px;
  width: 100%;
}

.wave-preview__waveform--loading {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.06),
    rgba(255, 255, 255, 0.12),
    rgba(255, 255, 255, 0.06)
  );
  background-size: 240% 100%;
  border-radius: 12px;
  min-height: 22px;
  animation: wave-skeleton 1.1s ease-in-out infinite;
}

.wave-preview__label {
  font-size: 11px;
  letter-spacing: 0.02em;
  color: rgba(148, 163, 184, 0.86);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.wave-preview__error {
  grid-column: 1 / -1;
  font-size: 12px;
  color: #dc2626;
}

@keyframes wave-skeleton {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 100% 0%;
  }
}
</style>
