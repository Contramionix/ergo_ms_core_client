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
const windowEl = ref(null)

const windowStyle = computed(() => {
  if (props.window.isMinimized) {
    return {
      position: 'fixed',
      top: props.window.position.y + 'px',
      left: props.window.position.x + 'px',
      width: '300px',
      height: '40px',
      zIndex: 10000 + props.window.zIndex,
      maxWidth: '300px',
      maxHeight: '40px',
      transition: 'all 0.3s ease'
    }
  }
  
  if (props.window.isMaximized) {
    return {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: 10000 + props.window.zIndex,
      maxWidth: '100vw',
      maxHeight: '100vh',
      transition: 'none'
    }
  }
  
  const width = props.window.size.width
  const height = props.window.size.height
  
  return {
    position: 'fixed',
    top: Math.max(0, props.window.position.y) + 'px',
    left: Math.max(0, props.window.position.x) + 'px',
    width: width,
    height: height,
    zIndex: 10000 + props.window.zIndex,
    maxWidth: '100vw',
    maxHeight: '100vh',
    boxSizing: 'border-box',
    transition: 'none'
  }
})

const handlePositionUpdate = (newPosition) => {
  windowManagerStore.updateWindowPosition(props.window.id, newPosition, false)
}

const handleSizeUpdate = (newSize) => {
  windowManagerStore.updateWindowSize(props.window.id, newSize)
  windowManagerStore.saveWindowsToStorage()
}

const { handleResizeStart } = useWindowResize(
  computed(() => props.window),
  handleSizeUpdate
)

function handleMinimize() {
  windowManagerStore.toggleMinimize(props.window.id)
}

function handleMaximize() {
  windowManagerStore.toggleMaximize(props.window.id)
}

function handleClose() {
  windowManagerStore.closeWindow(props.window.id)
}

function handleDock() {
  windowManagerStore.dockWindow(props.window.id)
}

function handleActivate(e) {
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
  
  requestAnimationFrame(() => {
    windowManagerStore.setActiveWindow(props.window.id)
  })
}

function handleDrag(newPosition) {
  // Для открепленных окон используем абсолютные координаты экрана
  windowManagerStore.updateWindowPosition(props.window.id, newPosition, false)
}

function handleDragEnd() {
  windowManagerStore.saveWindowsToStorage()
}

onMounted(() => {
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
    class="detached-window"
    :class="{
      'detached-window--active': window.isActive,
      'detached-window--minimized': window.isMinimized,
      'detached-window--maximized': window.isMaximized
    }"
    :style="windowStyle"
  >
    <WindowHeader
      :title="window.title"
      :is-active="window.isActive"
      :is-minimized="window.isMinimized"
      :is-maximized="window.isMaximized"
      :is-detached="true"
      @minimize="handleMinimize"
      @maximize="handleMaximize"
      @close="handleClose"
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
      class="detached-window__resize-handles"
    >
      <div
        class="detached-window__resize-handle detached-window__resize-handle--n"
        @mousedown="(e) => handleResizeStart(e, 'n')"
      />
      <div
        class="detached-window__resize-handle detached-window__resize-handle--s"
        @mousedown="(e) => handleResizeStart(e, 's')"
      />
      <div
        class="detached-window__resize-handle detached-window__resize-handle--e"
        @mousedown="(e) => handleResizeStart(e, 'e')"
      />
      <div
        class="detached-window__resize-handle detached-window__resize-handle--w"
        @mousedown="(e) => handleResizeStart(e, 'w')"
      />
      <div
        class="detached-window__resize-handle detached-window__resize-handle--ne"
        @mousedown="(e) => handleResizeStart(e, 'ne')"
      />
      <div
        class="detached-window__resize-handle detached-window__resize-handle--nw"
        @mousedown="(e) => handleResizeStart(e, 'nw')"
      />
      <div
        class="detached-window__resize-handle detached-window__resize-handle--se"
        @mousedown="(e) => handleResizeStart(e, 'se')"
      />
      <div
        class="detached-window__resize-handle detached-window__resize-handle--sw"
        @mousedown="(e) => handleResizeStart(e, 'sw')"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './styles/window.scss';

// Открепленные окна используют те же стили, что и обычные окна
.detached-window {
  // Обычные непрозрачные цвета
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  will-change: transform;
  
  &--active {
    background: #ffffff;
    border-color: var(--bs-primary, #0d6efd);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px) scale(1.005);
  }
  
  // Темная тема
  @media (prefers-color-scheme: dark) {
    background: #212529;
    border-color: #495057;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    
    &--active {
      background: #212529;
      border-color: var(--bs-primary, #0d6efd);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
    }
  }
  
  &--minimized {
    transition: all 0.3s ease;
  }
  
  &--maximized {
    border-radius: 0;
    transition: all 0.3s ease;
  }
  
  &__resize-handles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }
  
  &__resize-handle {
    position: absolute;
    pointer-events: all;
    z-index: 10;
    
    &--n {
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      cursor: ns-resize;
    }
    
    &--s {
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      cursor: ns-resize;
    }
    
    &--e {
      top: 0;
      right: 0;
      bottom: 0;
      width: 4px;
      cursor: ew-resize;
    }
    
    &--w {
      top: 0;
      left: 0;
      bottom: 0;
      width: 4px;
      cursor: ew-resize;
    }
    
    &--ne {
      top: 0;
      right: 0;
      width: 8px;
      height: 8px;
      cursor: nesw-resize;
    }
    
    &--nw {
      top: 0;
      left: 0;
      width: 8px;
      height: 8px;
      cursor: nwse-resize;
    }
    
    &--se {
      bottom: 0;
      right: 0;
      width: 8px;
      height: 8px;
      cursor: nwse-resize;
    }
    
    &--sw {
      bottom: 0;
      left: 0;
      width: 8px;
      height: 8px;
      cursor: nesw-resize;
    }
  }
}
</style>

