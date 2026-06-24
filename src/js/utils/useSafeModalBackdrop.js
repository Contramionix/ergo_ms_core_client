import { ref } from 'vue'

/**
 * Закрывает модалку по клику на backdrop, но не при выделении текста
 * (mousedown внутри формы → mouseup на backdrop).
 */
export function useSafeModalBackdrop(onClose) {
  const backdropMouseDownTarget = ref(null)

  const onBackdropMouseDown = (event) => {
    backdropMouseDownTarget.value = event.target
  }

  const onBackdropClick = (event) => {
    if (event.target === backdropMouseDownTarget.value) {
      onClose()
    }
    backdropMouseDownTarget.value = null
  }

  return {
    onBackdropMouseDown,
    onBackdropClick,
  }
}
