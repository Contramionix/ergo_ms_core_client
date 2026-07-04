import { ref, onMounted, onUnmounted, nextTick } from 'vue'

/**
 * Композабл для управления состоянием dropdown меню
 * @param {Function} emit - функция emit из defineEmits
 * @returns {Object} объект с состоянием и методами dropdown
 */
export function useDropdown(emit) {
  const dropdownRef = ref(null)
  const isOpen = ref(false)
  let suppressOutsideClick = false

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
    if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
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
    closeDropdown
  }
}
