import { onBeforeUnmount, watch, type WatchOptions, type WatchSource } from 'vue'

export const useDebouncedWatch = <T>(
  source: WatchSource<T> | WatchSource<T>[],
  callback: () => void,
  delayMs: number,
  options?: WatchOptions,
) => {
  let timer: number | null = null

  const cancel = () => {
    if (!timer) return
    window.clearTimeout(timer)
    timer = null
  }

  const stop = watch(
    source as any,
    () => {
      cancel()
      timer = window.setTimeout(() => {
        timer = null
        callback()
      }, delayMs)
    },
    options,
  )

  onBeforeUnmount(() => {
    cancel()
    stop()
  })

  return { cancel, stop }
}

