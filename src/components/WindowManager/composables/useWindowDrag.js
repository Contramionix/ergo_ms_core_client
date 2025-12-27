import { ref } from 'vue'

/**
 * Composable для управления перетаскиванием окон
 */
export function useWindowDrag(window, onPositionUpdate) {
  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  const dragOffset = ref({ x: 0, y: 0 })
  
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Только левая кнопка мыши
    
    isDragging.value = true
    dragStart.value = {
      x: e.clientX - dragOffset.value.x,
      y: e.clientY - dragOffset.value.y
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    e.preventDefault()
  }
  
  const handleMouseMove = (e) => {
    if (!isDragging.value) return
    
    dragOffset.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y
    }
    
    const newPosition = {
      x: window.value.position.x + dragOffset.value.x,
      y: window.value.position.y + dragOffset.value.y
    }
    
    // Ограничиваем перемещение границами контейнера
    const container = document.querySelector('.window-manager-container')
    if (container) {
      const containerRect = container.getBoundingClientRect()
      const maxX = containerRect.width - 200 // Минимальная ширина окна
      const maxY = containerRect.height - 100 // Минимальная высота окна
      
      newPosition.x = Math.max(0, Math.min(newPosition.x, maxX))
      newPosition.y = Math.max(0, Math.min(newPosition.y, maxY))
    }
    
    if (onPositionUpdate) {
      onPositionUpdate(newPosition)
    }
  }
  
  const handleMouseUp = () => {
    if (isDragging.value) {
      isDragging.value = false
      dragOffset.value = { x: 0, y: 0 }
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }
  
  return {
    isDragging,
    handleMouseDown
  }
}

