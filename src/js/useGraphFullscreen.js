import { onBeforeUnmount, onMounted, ref } from 'vue'

function fsElement() {
  if (typeof document === 'undefined') return null
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

function requestFs(el) {
  if (el.requestFullscreen) return el.requestFullscreen()
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen()
  return Promise.reject(new Error('fullscreen-unavailable'))
}

function exitFs() {
  if (typeof document === 'undefined') return Promise.resolve()
  if (document.exitFullscreen) return document.exitFullscreen()
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen()
  return Promise.resolve()
}

export function useGraphFullscreen(targetRef, { onToggle } = {}) {
  const isFullscreen = ref(false)
  let cssFallback = false

  function syncFromDocument() {
    const el = targetRef.value
    const native = Boolean(el && fsElement() === el)
    if (native) cssFallback = false
    isFullscreen.value = native || cssFallback
    onToggle?.(isFullscreen.value)
  }

  async function enter() {
    const el = targetRef.value
    if (!el) return
    try {
      await requestFs(el)
      return
    } catch {
      cssFallback = true
      document.documentElement.classList.add('graph-atlas-fs')
      isFullscreen.value = true
      onToggle?.(true)
    }
  }

  async function exit() {
    if (fsElement()) {
      try {
        await exitFs()
        return
      } catch {
        /* fall through to CSS */
      }
    }
    cssFallback = false
    document.documentElement.classList.remove('graph-atlas-fs')
    isFullscreen.value = false
    onToggle?.(false)
  }

  function toggle() {
    if (isFullscreen.value) exit()
    else enter()
  }

  function onKeydown(event) {
    if (event.key !== 'Escape') return
    if (cssFallback && isFullscreen.value) {
      event.preventDefault()
      exit()
    }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', syncFromDocument)
    document.addEventListener('webkitfullscreenchange', syncFromDocument)
    document.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', syncFromDocument)
    document.removeEventListener('webkitfullscreenchange', syncFromDocument)
    document.removeEventListener('keydown', onKeydown)
    if (cssFallback) {
      cssFallback = false
      document.documentElement.classList.remove('graph-atlas-fs')
      isFullscreen.value = false
    }
  })

  return { isFullscreen, toggleFullscreen: toggle, exitFullscreen: exit }
}
