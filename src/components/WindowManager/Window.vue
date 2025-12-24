<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useWindowManagerStore } from '@/stores/windowManager'
import WindowHeader from './WindowHeader.vue'
import WindowContent from './WindowContent.vue'
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
      maxHeight: '100%'
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
      maxHeight: '40px'
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
    boxSizing: 'border-box'
  }
})

const handlePositionUpdate = (newPosition) => {
  windowManagerStore.updateWindowPosition(props.window.id, newPosition)
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

function handleActivate() {
  windowManagerStore.setActiveWindow(props.window.id)
}

function handleDrag(newPosition) {
  // newPosition уже в абсолютных координатах, нужно преобразовать в относительные
  const container = document.querySelector('.window-manager-container')
  if (container) {
    const containerRect = container.getBoundingClientRect()
    const relativePosition = {
      x: newPosition.x - containerRect.left,
      y: newPosition.y - containerRect.top
    }
    windowManagerStore.updateWindowPosition(props.window.id, relativePosition)
  } else {
    windowManagerStore.updateWindowPosition(props.window.id, newPosition)
  }
}

function handleDragEnd() {
  windowManagerStore.saveWindowsToStorage()
}

onMounted(() => {
  if (windowEl.value) {
    windowEl.value.addEventListener('mousedown', handleActivate)
  }
})

onBeforeUnmount(() => {
  if (windowEl.value) {
    windowEl.value.removeEventListener('mousedown', handleActivate)
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
  </div>
</template>

<style scoped lang="scss">
@import './styles/window.scss';
</style>

