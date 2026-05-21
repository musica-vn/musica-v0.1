<script setup lang="ts">
import Button from 'primevue/button'
import WaveSurfer from 'wavesurfer.js'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  audioUrl: string | null
  compact?: boolean
  disabled?: boolean
}>()

const waveformContainer = ref<HTMLElement | null>(null)
const waveSurfer = ref<WaveSurfer | null>(null)
const isReady = ref(false)
const isPlaying = ref(false)
const localError = ref<string | null>(null)

const iconClass = computed(() => (isPlaying.value ? 'pi pi-pause' : 'pi pi-play'))

const destroyWaveSurfer = () => {
  waveSurfer.value?.destroy()
  waveSurfer.value = null
  isReady.value = false
  isPlaying.value = false
}

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
  await instance.load(audioUrl)
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
    <div ref="waveformContainer" class="wave-preview__waveform" />
    <div v-if="localError" class="wave-preview__error">{{ localError }}</div>
  </div>
</template>

<style scoped>
.wave-preview {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
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

.wave-preview__error {
  grid-column: 1 / -1;
  font-size: 12px;
  color: #dc2626;
}
</style>
