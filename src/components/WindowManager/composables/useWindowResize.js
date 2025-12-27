import { ref } from 'vue'

/**
 * Composable для управления изменением размера окон
 */
export function useWindowResize(window, onSizeUpdate) {
  const isResizing = ref(false)
  const resizeHandle = ref(null) // 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
  const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })
  
  const minWidth = 300
  const minHeight = 200
  
  const handleResizeStart = (e, handle) => {
    if (e.button !== 0) return
    
    isResizing.value = true
    resizeHandle.value = handle
    resizeStart.value = {
      x: e.clientX,
      y: e.clientY,
      width: parseFloat(window.value.size.width) || 400,
      height: parseFloat(window.value.size.height) || 300
    }
    
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleResizeMove = (e) => {
    if (!isResizing.value) return
    
    const deltaX = e.clientX - resizeStart.value.x
    const deltaY = e.clientY - resizeStart.value.y
    
    let newWidth = resizeStart.value.width
    let newHeight = resizeStart.value.height
    
    // Обработка разных ручек изменения размера
    if (resizeHandle.value.includes('e')) {
      newWidth = Math.max(minWidth, resizeStart.value.width + deltaX)
    }
    if (resizeHandle.value.includes('w')) {
      newWidth = Math.max(minWidth, resizeStart.value.width - deltaX)
    }
    if (resizeHandle.value.includes('s')) {
      newHeight = Math.max(minHeight, resizeStart.value.height + deltaY)
    }
    if (resizeHandle.value.includes('n')) {
      newHeight = Math.max(minHeight, resizeStart.value.height - deltaY)
    }
    
    const newSize = {
      width: `${newWidth}px`,
      height: `${newHeight}px`
    }
    
    if (onSizeUpdate) {
      onSizeUpdate(newSize)
    }
  }
  
  const handleResizeEnd = () => {
    if (isResizing.value) {
      isResizing.value = false
      resizeHandle.value = null
      
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      
      // Вызываем callback для сохранения после завершения resize
      if (onSizeUpdate && window.value) {
        onSizeUpdate(window.value.size)
      }
    }
  }
  
  return {
    isResizing,
    handleResizeStart
  }
}

