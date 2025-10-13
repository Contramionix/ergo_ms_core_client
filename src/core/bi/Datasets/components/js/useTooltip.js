import { ref } from 'vue'

export function useTooltip() {
  const tooltipText = ref('')
  const tooltipStyle = ref({})
  const showTooltip = ref(false)
  const tooltipTimeout = ref(null)
  const tooltipClass = ref('')

  function onIconHover(event, text, customClass = '') {
    if (tooltipTimeout.value) clearTimeout(tooltipTimeout.value)
    tooltipText.value = text
    tooltipClass.value = customClass
    showTooltip.value = true

    const rect = event.target.getBoundingClientRect()
    tooltipStyle.value = {
      top: `${rect.top + window.scrollY - 36}px`,
      left: `${rect.left + rect.width / 2 + window.scrollX}px`,
      transform: 'translateX(-50%)',
      position: 'absolute'
    }
  }

  function hideTooltipWithDelay() {
    tooltipTimeout.value = setTimeout(() => {
      showTooltip.value = false
    }, 100)
  }

  return {
    tooltipText,
    tooltipStyle,
    showTooltip,
    tooltipClass,
    tooltipTimeout,
    onIconHover,
    hideTooltipWithDelay
  }
}