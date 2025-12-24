<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useWindowManagerStore } from '@/stores/windowManager'
import WindowHeader from './WindowHeader.vue'
import WindowContent from './WindowContent.vue'
import SnapLayouts from './SnapLayouts.vue'
import { useWindowResize } from './composables/useWindowResize.js'

const props = defineProps({
  window: {
    type: Object,
    required: true
  }
})

const windowManagerStore = useWindowManagerStore()
const windowRef = ref(null)
const windowEl = ref(null)

const windowStyle = computed(() => {
  if (props.window.isMaximized) {
    return {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: props.window.zIndex,
      maxWidth: '100%',
      maxHeight: '100%',
      transition: 'none' // Отключаем transition при максимизации
    }
  }
  
  if (props.window.isMinimized) {
    return {
      position: 'absolute',
      top: props.window.position.y + 'px',
      left: props.window.position.x + 'px',
      width: '300px',
      height: '40px',
      zIndex: props.window.zIndex,
      maxWidth: '300px',
      maxHeight: '40px',
      transition: 'all 0.3s ease'
    }
  }
  
  // Для нормального размера - используем фиксированные размеры
  const width = props.window.size.width
  const height = props.window.size.height
  
  return {
    position: 'absolute',
    top: Math.max(0, props.window.position.y) + 'px',
    left: Math.max(0, props.window.position.x) + 'px',
    width: width,
    height: height,
    zIndex: props.window.zIndex,
    maxWidth: '100%',
    maxHeight: '100%',
    boxSizing: 'border-box',
    transition: 'none' // Отключаем transition при перетаскивании для плавности
  }
})

const handlePositionUpdate = (newPosition) => {
  // Не используем snap при программном обновлении позиции
  windowManagerStore.updateWindowPosition(props.window.id, newPosition, false)
}

const handleSizeUpdate = (newSize) => {
  windowManagerStore.updateWindowSize(props.window.id, newSize)
  windowManagerStore.saveWindowsToStorage()
}

// Drag будет обрабатываться через заголовок окна

const { handleResizeStart } = useWindowResize(
  computed(() => props.window),
  handleSizeUpdate
)

function handleMinimize() {
  windowManagerStore.toggleMinimize(props.window.id)
}

function handleMaximize() {
  // Переключаем максимизацию
  const newMaximized = !props.window.isMaximized
  windowManagerStore.toggleMaximize(props.window.id)
  
  // Если разворачиваем, сохраняем текущий размер для восстановления
  if (newMaximized && !props.window.isMaximized) {
    // Сохраняем размер перед максимизацией
    const savedSize = { ...props.window.size }
    windowManagerStore.updateWindowSize(props.window.id, savedSize)
  }
}

function handleClose() {
  windowManagerStore.closeWindow(props.window.id)
}

function handleDetach() {
  windowManagerStore.detachWindow(props.window.id)
}

function handleDock() {
  windowManagerStore.dockWindow(props.window.id)
}

function handleActivate(e) {
  // Предотвращаем активацию при клике на интерактивные элементы
  if (e && e.target && (
    e.target.closest('button') ||
    e.target.closest('input') ||
    e.target.closest('select') ||
    e.target.closest('textarea') ||
    e.target.closest('a') ||
    e.target.closest('.window-header__btn')
  )) {
    return
  }
  
  // Используем requestAnimationFrame для плавного переключения без перерисовки
  requestAnimationFrame(() => {
    windowManagerStore.setActiveWindow(props.window.id)
  })
}

const showSnapLayouts = ref(false)
const snapLayoutsMousePos = ref({ x: 0, y: 0 })

function handleDrag(newPosition, snapZone) {
  // newPosition уже в абсолютных координатах, нужно преобразовать в относительные
  // Обновляем позицию напрямую для максимальной плавности
  const container = document.querySelector('.window-manager-container')
  if (container) {
    const containerRect = container.getBoundingClientRect()
    const relativePosition = {
      x: newPosition.x - containerRect.left,
      y: newPosition.y - containerRect.top
    }
    // При перетаскивании не привязываем к слотам (snapToSlot = false)
    windowManagerStore.updateWindowPosition(props.window.id, relativePosition, false)
  } else {
    windowManagerStore.updateWindowPosition(props.window.id, newPosition, false)
  }
}

async function handleDragEnd(targetSlotIndex, snapZone) {
  const container = document.querySelector('.window-manager-container')
  
  if (snapZone) {
    // Если есть snap зона, применяем snap
    if (container) {
      const containerRect = container.getBoundingClientRect()
      const relativePosition = {
        x: props.window.position.x,
        y: props.window.position.y
      }
      
      const snapAssistModule = await import('./composables/useSnapAssist.js')
      const { applySnap, getSnapSize } = snapAssistModule
      const snappedPosition = applySnap(relativePosition, {
        width: containerRect.width,
        height: containerRect.height
      }, snapZone)
      
      windowManagerStore.updateWindowPosition(props.window.id, snappedPosition, false)
      
      const snapSize = getSnapSize(snapZone, {
        width: containerRect.width,
        height: containerRect.height
      })
      if (snapSize) {
        windowManagerStore.updateWindowSize(props.window.id, snapSize)
      }
    }
  }
  windowManagerStore.saveWindowsToStorage()
}

function handleShowSnapLayouts(show, mousePos) {
  showSnapLayouts.value = show
  if (mousePos) {
    snapLayoutsMousePos.value = mousePos
  }
}

function handleSnap(layout) {
  const container = document.querySelector('.window-manager-container')
  if (container) {
    const containerRect = container.getBoundingClientRect()
    const snapPosition = windowManagerStore.calculateSnapPosition(layout, {
      width: containerRect.width,
      height: containerRect.height
    })
    const snapSize = windowManagerStore.calculateSnapSize(layout, {
      width: containerRect.width,
      height: containerRect.height
    })
    
    windowManagerStore.updateWindowPosition(props.window.id, snapPosition, false)
    windowManagerStore.updateWindowSize(props.window.id, snapSize)
    windowManagerStore.saveWindowsToStorage()
  }
  showSnapLayouts.value = false
}

onMounted(() => {
  // Используем capture phase для более раннего перехвата
  if (windowEl.value) {
    windowEl.value.addEventListener('mousedown', handleActivate, { capture: true, passive: true })
  }
})

onBeforeUnmount(() => {
  if (windowEl.value) {
    windowEl.value.removeEventListener('mousedown', handleActivate, { capture: true })
  }
})
</script>

<template>
  <div
    ref="windowEl"
    class="window"
    :class="{
      'window--active': window.isActive,
      'window--minimized': window.isMinimized,
      'window--maximized': window.isMaximized,
      'window--detached': window.isDetached
    }"
    :style="windowStyle"
  >
    <WindowHeader
      :title="window.title"
      :is-active="window.isActive"
      :is-minimized="window.isMinimized"
      :is-maximized="window.isMaximized"
      :is-detached="window.isDetached"
      @minimize="handleMinimize"
      @maximize="handleMaximize"
      @close="handleClose"
      @detach="handleDetach"
      @dock="handleDock"
      @activate="handleActivate"
      @drag="handleDrag"
      @drag-end="handleDragEnd"
    />
    <WindowContent
      v-if="!window.isMinimized"
      :window="window"
    />
    
    <!-- Resize handles -->
    <div
      v-if="!window.isMinimized && !window.isMaximized"
      class="window__resize-handles"
    >
      <div
        class="window__resize-handle window__resize-handle--n"
        @mousedown="(e) => handleResizeStart(e, 'n')"
      />
      <div
        class="window__resize-handle window__resize-handle--s"
        @mousedown="(e) => handleResizeStart(e, 's')"
      />
      <div
        class="window__resize-handle window__resize-handle--e"
        @mousedown="(e) => handleResizeStart(e, 'e')"
      />
      <div
        class="window__resize-handle window__resize-handle--w"
        @mousedown="(e) => handleResizeStart(e, 'w')"
      />
      <div
        class="window__resize-handle window__resize-handle--ne"
        @mousedown="(e) => handleResizeStart(e, 'ne')"
      />
      <div
        class="window__resize-handle window__resize-handle--nw"
        @mousedown="(e) => handleResizeStart(e, 'nw')"
      />
      <div
        class="window__resize-handle window__resize-handle--se"
        @mousedown="(e) => handleResizeStart(e, 'se')"
      />
      <div
        class="window__resize-handle window__resize-handle--sw"
        @mousedown="(e) => handleResizeStart(e, 'sw')"
      />
    </div>
    
    <!-- Snap Layouts Overlay -->
    <SnapLayouts
      :show="showSnapLayouts"
      :mouse-position="snapLayoutsMousePos"
      @snap="handleSnap"
      @close="showSnapLayouts = false"
    />
  </div>
</template>

<style scoped lang="scss">
@import './styles/window.scss';
</style>

