<script setup>
import { ref } from 'vue'
import { Minus, Maximize2, X, ExternalLink, Move } from 'lucide-vue-next'

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

const emit = defineEmits(['minimize', 'maximize', 'close', 'detach', 'dock', 'activate', 'drag', 'drag-end'])

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const initialPosition = ref({ x: 0, y: 0 })
const windowElRef = ref(null)

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
  const windowEl = e.currentTarget.closest('.window')
  if (!windowEl) return
  
  windowElRef.value = windowEl
  const rect = windowEl.getBoundingClientRect()
  initialPosition.value = {
    x: rect.left,
    y: rect.top
  }
  
  dragStart.value = {
    x: e.clientX,
    y: e.clientY
  }
  
  isDragging.value = true
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  e.preventDefault()
  e.stopPropagation()
}

function handleMouseMove(e) {
  if (!isDragging.value || !windowElRef.value) return
  
  const deltaX = e.clientX - dragStart.value.x
  const deltaY = e.clientY - dragStart.value.y
  
  let newPosition = {
    x: initialPosition.value.x + deltaX,
    y: initialPosition.value.y + deltaY
  }
  
  // Ограничиваем перемещение границами контейнера
  const container = document.querySelector('.window-manager-container')
  if (container) {
    const containerRect = container.getBoundingClientRect()
    const windowRect = windowElRef.value.getBoundingClientRect()
    const windowWidth = windowRect.width || 400
    const windowHeight = windowRect.height || 300
    
    newPosition.x = Math.max(containerRect.left, Math.min(newPosition.x, containerRect.right - windowWidth))
    newPosition.y = Math.max(containerRect.top, Math.min(newPosition.y, containerRect.bottom - windowHeight))
  }
  
  emit('drag', newPosition)
}

function handleMouseUp() {
  if (isDragging.value) {
    isDragging.value = false
    dragStart.value = { x: 0, y: 0 }
    initialPosition.value = { x: 0, y: 0 }
    windowElRef.value = null
    
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    emit('drag-end')
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
