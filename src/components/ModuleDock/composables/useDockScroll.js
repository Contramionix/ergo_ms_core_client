import { ref } from 'vue'

/**
 * Composable для управления прокруткой dock
 */
export function useDockScroll(dockRef, scrollLeft) {
  const handleScroll = (e) => {
    if (dockRef.value) {
      scrollLeft.value = dockRef.value.scrollLeft
    }
  }
  
  const scrollToModule = (moduleIndex) => {
    if (dockRef.value) {
      const container = dockRef.value
      const icons = container.querySelectorAll('.module-icon')
      if (icons[moduleIndex]) {
        const icon = icons[moduleIndex]
        const iconLeft = icon.offsetLeft
        const iconWidth = icon.offsetWidth
        const containerWidth = container.offsetWidth
        const scrollPosition = iconLeft - (containerWidth / 2) + (iconWidth / 2)
        
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        })
      }
    }
  }
  
  const scrollToActive = (activeIndex) => {
    if (activeIndex !== null && activeIndex !== undefined) {
      scrollToModule(activeIndex)
    }
  }
  
  return {
    handleScroll,
    scrollToModule,
    scrollToActive
  }
}

