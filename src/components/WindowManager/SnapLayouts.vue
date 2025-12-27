<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  mousePosition: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['snap', 'close'])

const snapLayouts = [
  {
    id: 'left',
    name: 'Слева',
    icon: '◧',
    zones: [{ x: 0, y: 0, width: 50, height: 100 }]
  },
  {
    id: 'right',
    name: 'Справа',
    icon: '◨',
    zones: [{ x: 50, y: 0, width: 50, height: 100 }]
  },
  {
    id: 'top-left',
    name: 'Верх-слева',
    icon: '◰',
    zones: [{ x: 0, y: 0, width: 50, height: 50 }]
  },
  {
    id: 'top-right',
    name: 'Верх-справа',
    icon: '◱',
    zones: [{ x: 50, y: 0, width: 50, height: 50 }]
  },
  {
    id: 'bottom-left',
    name: 'Низ-слева',
    icon: '◳',
    zones: [{ x: 0, y: 50, width: 50, height: 50 }]
  },
  {
    id: 'bottom-right',
    name: 'Низ-справа',
    icon: '◲',
    zones: [{ x: 50, y: 50, width: 50, height: 50 }]
  },
  {
    id: 'center',
    name: 'Центр',
    icon: '⬚',
    zones: [{ x: 25, y: 25, width: 50, height: 50 }]
  },
  {
    id: 'grid-2x2',
    name: 'Сетка 2x2',
    icon: '▦',
    zones: [
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 50, y: 0, width: 50, height: 50 },
      { x: 0, y: 50, width: 50, height: 50 },
      { x: 50, y: 50, width: 50, height: 50 }
    ]
  }
]

const hoveredLayout = computed(() => {
  if (!props.show) return null
  
  // Определяем, над каким layout находится курсор
  const container = document.querySelector('.window-manager-container')
  if (!container) return null
  
  const containerRect = container.getBoundingClientRect()
  const relativeX = (props.mousePosition.x - containerRect.left) / containerRect.width * 100
  const relativeY = (props.mousePosition.y - containerRect.top) / containerRect.height * 100
  
  // Проверяем каждый layout
  for (const layout of snapLayouts) {
    for (const zone of layout.zones) {
      if (
        relativeX >= zone.x &&
        relativeX <= zone.x + zone.width &&
        relativeY >= zone.y &&
        relativeY <= zone.y + zone.height
      ) {
        return layout
      }
    }
  }
  
  return null
})

function handleSnap(layout) {
  emit('snap', layout)
  emit('close')
}
</script>

<template>
  <div
    v-if="show"
    class="snap-layouts"
    @click="emit('close')"
  >
    <div class="snap-layouts__overlay" />
    <div class="snap-layouts__container">
      <div
        v-for="layout in snapLayouts"
        :key="layout.id"
        class="snap-layouts__item"
        :class="{ 'snap-layouts__item--hovered': hoveredLayout?.id === layout.id }"
        @click.stop="handleSnap(layout)"
        :title="layout.name"
      >
        <div class="snap-layouts__preview">
          <div
            v-for="(zone, index) in layout.zones"
            :key="index"
            class="snap-layouts__zone"
            :style="{
              left: zone.x + '%',
              top: zone.y + '%',
              width: zone.width + '%',
              height: zone.height + '%'
            }"
          />
        </div>
        <div class="snap-layouts__label">{{ layout.name }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.snap-layouts {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}

.snap-layouts__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
}

.snap-layouts__container {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 2rem;
  max-width: 800px;
  z-index: 1;
}

.snap-layouts__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  
  &:hover,
  &--hovered {
    border-color: var(--bs-primary, #0d6efd);
    background: rgba(var(--bs-primary-rgb, 13, 110, 253), 0.1);
    transform: scale(1.05);
  }
}

.snap-layouts__preview {
  position: relative;
  width: 80px;
  height: 80px;
  border: 2px solid var(--bs-border-color, #dee2e6);
  border-radius: 4px;
  background: var(--bs-body-bg, #f8f9fa);
}

.snap-layouts__zone {
  position: absolute;
  background: var(--bs-primary, #0d6efd);
  opacity: 0.3;
  border: 2px solid var(--bs-primary, #0d6efd);
  border-radius: 2px;
  transition: all 0.2s ease;
}

.snap-layouts__item--hovered .snap-layouts__zone {
  opacity: 0.6;
  background: var(--bs-primary, #0d6efd);
}

.snap-layouts__label {
  font-size: 0.75rem;
  color: var(--bs-body-color, #212529);
  text-align: center;
  font-weight: 500;
}
</style>

