<script setup>
import { ref } from 'vue'
import { Minus, Maximize2, X, ExternalLink, Move } from 'lucide-vue-next'
import { useWindowManagerStore } from '@/stores/windowManager'
import { useSnapAssist } from './composables/useSnapAssist'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isMinimized: {
    type: Boolean,
    default: false
  },
  isMaximized: {
    type: Boolean,
    default: false
  },
  isDetached: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['minimize', 'maximize', 'close', 'detach', 'dock', 'activate', 'drag', 'drag-end', 'show-snap-layouts', 'snap'])

const windowManagerStore = useWindowManagerStore()
const { detectSnapZone, applySnap, getSnapSize } = useSnapAssist()

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const initialPosition = ref({ x: 0, y: 0 })
const windowElRef = ref(null)
const snapZone = ref(null)
const showSnapLayouts = ref(false)

function handleMinimize(e) {
  e.stopPropagation()
  emit('minimize')
}

function handleMaximize(e) {
  e.stopPropagation()
  emit('maximize')
}

function handleClose(e) {
  e.stopPropagation()
  emit('close')
}

function handleDetach(e) {
  e.stopPropagation()
  emit('detach')
}

function handleDock(e) {
  e.stopPropagation()
  emit('dock')
}

function handleMouseDown(e) {
  // Игнорируем клики на кнопки
  if (e.target.closest('.window-header__btn')) {
    return
  }
  
  if (e.button !== 0) return // Только левая кнопка мыши
  
  emit('activate')
  
  // Получаем текущую позицию окна
  const windowEl = e.currentTarget.closest('.window, .detached-window')
  if (!windowEl) return
  
  windowElRef.value = windowEl
  const rect = windowEl.getBoundingClientRect()
  
  // Для открепленных окон используем абсолютные координаты экрана
  if (props.isDetached) {
    initialPosition.value = {
      x: rect.left,
      y: rect.top
    }
  } else {
    // Для обычных окон используем координаты относительно контейнера
    const container = document.querySelector('.window-manager-container')
    if (container) {
      const containerRect = container.getBoundingClientRect()
      initialPosition.value = {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top
      }
    } else {
      initialPosition.value = {
        x: rect.left,
        y: rect.top
      }
    }
  }
  
  dragStart.value = {
    x: e.clientX,
    y: e.clientY
  }
  
  isDragging.value = true
  snapZone.value = null
  showSnapLayouts.value = false
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  e.preventDefault()
  e.stopPropagation()
}

// Сохраняем последнюю позицию мыши для requestAnimationFrame
let lastMouseEvent = null
let rafId = null

function handleMouseMove(e) {
  if (!isDragging.value || !windowElRef.value) return
  
  // Сохраняем последнее событие мыши
  lastMouseEvent = e
  
  // Используем requestAnimationFrame для плавности, но не блокируем события
  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      rafId = null
      
      if (!lastMouseEvent || !isDragging.value) return
      
      const deltaX = lastMouseEvent.clientX - dragStart.value.x
      const deltaY = lastMouseEvent.clientY - dragStart.value.y
      
      // Проверяем, является ли окно открепленным
      const isDetached = props.isDetached
      
      if (isDetached) {
        // Для открепленных окон используем абсолютные координаты экрана
        const windowRect = windowElRef.value.getBoundingClientRect()
        const windowWidth = windowRect.width || 400
        const windowHeight = windowRect.height || 300
        
        let newPosition = {
          x: initialPosition.value.x + deltaX,
          y: initialPosition.value.y + deltaY
        }
        
        // Ограничиваем перемещение границами экрана
        newPosition.x = Math.max(0, Math.min(newPosition.x, window.innerWidth - windowWidth))
        newPosition.y = Math.max(0, Math.min(newPosition.y, window.innerHeight - windowHeight))
        
        emit('drag', newPosition)
        return
      }
      
      // Для обычных окон используем логику с контейнером
      const container = document.querySelector('.window-manager-container')
      if (!container) {
        emit('drag', { x: initialPosition.value.x + deltaX, y: initialPosition.value.y + deltaY })
        return
      }
      
      const containerRect = container.getBoundingClientRect()
      const windowRect = windowElRef.value.getBoundingClientRect()
      const windowWidth = windowRect.width || 400
      const windowHeight = windowRect.height || 300
      
      // Новая позиция в абсолютных координатах
      let newPosition = {
        x: initialPosition.value.x + deltaX + containerRect.left,
        y: initialPosition.value.y + deltaY + containerRect.top
      }
      
      // Ограничиваем перемещение границами контейнера
      newPosition.x = Math.max(containerRect.left, Math.min(newPosition.x, containerRect.right - windowWidth))
      newPosition.y = Math.max(containerRect.top, Math.min(newPosition.y, containerRect.bottom - windowHeight))
      
      // Позиция относительно контейнера для определения snap зоны
      const relativePosition = {
        x: newPosition.x - containerRect.left,
        y: newPosition.y - containerRect.top
      }
      
      const containerSize = {
        width: containerRect.width,
        height: containerRect.height
      }
      
      // Определяем snap зону (привязка к краям и углам)
      const detectedSnapZone = detectSnapZone(relativePosition, containerSize)
      snapZone.value = detectedSnapZone
      
      // Если обнаружена snap зона, показываем snap layouts
      if (detectedSnapZone && !showSnapLayouts.value) {
        showSnapLayouts.value = true
        emit('show-snap-layouts', true, { x: lastMouseEvent.clientX, y: lastMouseEvent.clientY })
      } else if (!detectedSnapZone && showSnapLayouts.value) {
        showSnapLayouts.value = false
        emit('show-snap-layouts', false)
      }
      
      // Если есть snap зона, применяем привязку
      if (detectedSnapZone) {
        const snappedPosition = applySnap(relativePosition, containerSize, detectedSnapZone)
        newPosition = {
          x: snappedPosition.x + containerRect.left,
          y: snappedPosition.y + containerRect.top
        }
      }
      
      emit('drag', newPosition, detectedSnapZone)
    })
  }
}

function handleMouseUp() {
  if (isDragging.value) {
    isDragging.value = false
    
    // Отменяем pending animation frame
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    lastMouseEvent = null
    
    // Передаем информацию о snap зоне
    emit('drag-end', null, snapZone.value)
    
    dragStart.value = { x: 0, y: 0 }
    initialPosition.value = { x: 0, y: 0 }
    windowElRef.value = null
    snapZone.value = null
    showSnapLayouts.value = false
    emit('show-snap-layouts', false)
    
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
}
</script>

<template>
  <div 
    class="window-header"
    :class="{ 'window-header--active': isActive, 'window-header--dragging': isDragging }"
    @mousedown="handleMouseDown"
  >
    <div class="window-header__title">
      <Move :size="14" class="window-header__drag-icon" />
      <span>{{ title }}</span>
    </div>
    <div class="window-header__actions">
      <button
        v-if="!isDetached"
        class="window-header__btn"
        type="button"
        @click="handleDetach"
        title="Открепить окно"
        aria-label="Открепить окно"
      >
        <ExternalLink :size="14" />
      </button>
      <button
        v-else
        class="window-header__btn"
        type="button"
        @click="handleDock"
        title="Прикрепить окно"
        aria-label="Прикрепить окно"
      >
        <Move :size="14" />
      </button>
      <button
        class="window-header__btn"
        type="button"
        @click="handleMinimize"
        title="Свернуть"
        aria-label="Свернуть окно"
      >
        <Minus :size="14" />
      </button>
      <button
        class="window-header__btn"
        type="button"
        @click="handleMaximize"
        title="Развернуть"
        aria-label="Развернуть окно"
      >
        <Maximize2 :size="14" />
      </button>
      <button
        class="window-header__btn window-header__btn--close"
        type="button"
        @click="handleClose"
        title="Закрыть"
        aria-label="Закрыть окно"
      >
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './styles/window.scss';
</style>
