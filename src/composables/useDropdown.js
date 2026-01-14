import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Композабл для управления состоянием dropdown меню
 * @param {Function} emit - функция emit из defineEmits
 * @returns {Object} объект с состоянием и методами dropdown
 */
export function useDropdown(emit) {
  const dropdownRef = ref(null)
  const isOpen = ref(false)

  const toggleDropdown = () => {
    isOpen.value = !isOpen.value
    emit('dropdown-toggle', isOpen.value)
  }

  const closeDropdown = () => {
    isOpen.value = false
    emit('dropdown-toggle', false)
  }

  const handleClickOutside = (event) => {
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
