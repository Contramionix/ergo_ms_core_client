import { ref, onMounted, onUnmounted, nextTick } from 'vue'

/**
 * Композабл для управления состоянием dropdown меню.
 * @param {Function} emit - функция emit из defineEmits
 * @param {Object} [options]
 * @param {() => (HTMLElement|null|undefined)[]} [options.getExtraNodes] - узлы вне корня (teleport)
 */
export function useDropdown(emit, options = {}) {
  const getExtraNodes = options.getExtraNodes ?? (() => [])

  const dropdownRef = ref(null)
  const isOpen = ref(false)
  let suppressOutsideClick = false

  function containsTarget(target) {
    if (!(target instanceof Node)) {
      return false
    }
    if (dropdownRef.value?.contains(target)) {
      return true
    }
    return getExtraNodes().some((node) => node?.contains?.(target))
  }

  const toggleDropdown = () => {
    const willOpen = !isOpen.value
    isOpen.value = willOpen
    emit('dropdown-toggle', willOpen)

    if (willOpen) {
      suppressOutsideClick = true
      nextTick(() => {
        suppressOutsideClick = false
      })
    }
  }

  const closeDropdown = () => {
    if (!isOpen.value) {
      return
    }
    isOpen.value = false
    emit('dropdown-toggle', false)
  }

  const handleClickOutside = (event) => {
    if (suppressOutsideClick || !isOpen.value) {
      return
    }
    if (!containsTarget(event.target)) {
      closeDropdown()
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleClickOutside)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })

  return {
    dropdownRef,
    isOpen,
    toggleDropdown,
    closeDropdown,
    containsTarget,
  }
}
