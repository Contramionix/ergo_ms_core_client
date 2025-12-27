import { ref } from 'vue'

/**
 * Composable для реализации Snap Assist (привязка к краям и углам экрана)
 */
export function useSnapAssist() {
  const snapThreshold = 50 // Расстояние в пикселях для активации snap
  const snapZones = {
    left: { x: 0, width: 50 },
    right: { x: 50, width: 50 },
    top: { y: 0, height: 50 },
    bottom: { y: 50, height: 50 },
    topLeft: { x: 0, y: 0, width: 50, height: 50 },
    topRight: { x: 50, y: 0, width: 50, height: 50 },
    bottomLeft: { x: 0, y: 50, width: 50, height: 50 },
    bottomRight: { x: 50, y: 50, width: 50, height: 50 },
    center: { x: 25, y: 25, width: 50, height: 50 }
  }
  
  const activeSnapZone = ref(null)
  
  /**
   * Определяет, к какой зоне привязки ближе позиция
   */
  function detectSnapZone(position, containerSize) {
    const { width, height } = containerSize
    const { x, y } = position
    
    // Процентные координаты
    const percentX = (x / width) * 100
    const percentY = (y / height) * 100
    
    // Проверяем углы (приоритет выше)
    if (percentX < snapThreshold / width * 100 && percentY < snapThreshold / height * 100) {
      return 'topLeft'
    }
    if (percentX > 100 - snapThreshold / width * 100 && percentY < snapThreshold / height * 100) {
      return 'topRight'
    }
    if (percentX < snapThreshold / width * 100 && percentY > 100 - snapThreshold / height * 100) {
      return 'bottomLeft'
    }
    if (percentX > 100 - snapThreshold / width * 100 && percentY > 100 - snapThreshold / height * 100) {
      return 'bottomRight'
    }
    
    // Проверяем края
    if (percentX < snapThreshold / width * 100) {
      return 'left'
    }
    if (percentX > 100 - snapThreshold / width * 100) {
      return 'right'
    }
    if (percentY < snapThreshold / height * 100) {
      return 'top'
    }
    if (percentY > 100 - snapThreshold / height * 100) {
      return 'bottom'
    }
    
    // Проверяем центр
    if (
      percentX > 40 && percentX < 60 &&
      percentY > 40 && percentY < 60
    ) {
      return 'center'
    }
    
    return null
  }
  
  /**
   * Применяет snap к позиции
   */
  function applySnap(position, containerSize, snapZone) {
    if (!snapZone || !snapZones[snapZone]) {
      return position
    }
    
    const { width, height } = containerSize
    const zone = snapZones[snapZone]
    
    let newX = position.x
    let newY = position.y
    
    if (zone.x !== undefined) {
      newX = (zone.x / 100) * width
    }
    if (zone.y !== undefined) {
      newY = (zone.y / 100) * height
    }
    
    // Если зона имеет размер, центрируем окно в ней
    if (zone.width !== undefined && zone.height !== undefined) {
      // Размер окна будет установлен отдельно
    }
    
    return { x: newX, y: newY, snapZone }
  }
  
  /**
   * Получает размер окна для snap зоны
   */
  function getSnapSize(snapZone, containerSize) {
    if (!snapZone || !snapZones[snapZone]) {
      return null
    }
    
    const { width, height } = containerSize
    const zone = snapZones[snapZone]
    
    if (zone.width && zone.height) {
      return {
        width: `${(zone.width / 100) * width}px`,
        height: `${(zone.height / 100) * height}px`
      }
    }
    
    if (zone.width) {
      return {
        width: `${(zone.width / 100) * width}px`,
        height: '100%'
      }
    }
    
    if (zone.height) {
      return {
        width: '100%',
        height: `${(zone.height / 100) * height}px`
      }
    }
    
    return null
  }
  
  return {
    activeSnapZone,
    detectSnapZone,
    applySnap,
    getSnapSize,
    snapZones
  }
}

