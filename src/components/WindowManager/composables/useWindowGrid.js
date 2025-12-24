import { computed } from 'vue'

/**
 * Composable для управления сеткой окон
 */
export function useWindowGrid(windows) {
  const isMobile = computed(() => window.innerWidth < 768)
  const isTablet = computed(() => window.innerWidth < 1200)
  
  const gridColumns = computed(() => {
    if (isMobile.value) return 1
    if (isTablet.value) return 2
    return 2
  })
  
  const gridRows = computed(() => {
    if (isMobile.value) return 1
    if (isTablet.value) return 2
    return 2
  })
  
  const getGridPosition = (index) => {
    const cols = gridColumns.value
    const row = Math.floor(index / cols)
    const col = index % cols
    
    return { row, col }
  }
  
  const calculateWindowSize = () => {
    if (isMobile.value) {
      return { width: '100%', height: '100%' }
    } else if (isTablet.value) {
      return { width: '50%', height: '50%' }
    } else {
      return { width: '50%', height: '50%' }
    }
  }
  
  return {
    isMobile,
    isTablet,
    gridColumns,
    gridRows,
    getGridPosition,
    calculateWindowSize
  }
}

