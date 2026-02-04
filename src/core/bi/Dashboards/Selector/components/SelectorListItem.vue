<template>
  <div
    class="selector-item"
    :class="{
      active: activeIndex === index,
      dragging: draggedIndex === index,
      'drag-over': dragOverIndex === index && draggedIndex !== index
    }"
    draggable="true"
    @dragstart="onDragStart && onDragStart(index, $event)"
    @dragover.prevent="onDragOver && onDragOver(index, $event)"
    @drop="onDrop && onDrop(index, $event)"
    @dragenter.prevent="onDragEnter && onDragEnter(index, $event)"
    @dragleave="onDragLeave && onDragLeave($event)"
    @dragend="onDragEnd && onDragEnd($event)"
    @click="onSetActiveSelector && onSetActiveSelector(index)"
  >
    <span class="selector-icon">
      <GripVertical absolute-stroke-width size="14" class="drag-handle" />
      <Star
        size="20"
        :class="{
          'star-favorite': selector.isFavorite,
          'star-regular': !selector.isFavorite
        }"
        @click.stop="onToggleFavorite && onToggleFavorite(index)"
      />
    </span>
    <span class="selector-name" :title="selector.title">{{ selector.title }}</span>
    <button
      v-if="listLength > 1"
      class="delete-selector-btn"
      @click.stop="onRemoveSelector && onRemoveSelector(index)"
      title="Удалить селектор"
    >
      ✕
    </button>
  </div>
</template>

<script setup>
import { GripVertical, Star } from 'lucide-vue-next';

const props = defineProps({
  selector: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  activeIndex: {
    type: Number,
    required: true
  },
  draggedIndex: {
    type: Number,
    default: null
  },
  dragOverIndex: {
    type: Number,
    default: null
  },
  listLength: {
    type: Number,
    required: true
  },
  onDragStart: {
    type: Function,
    default: null
  },
  onDragOver: {
    type: Function,
    default: null
  },
  onDrop: {
    type: Function,
    default: null
  },
  onDragEnter: {
    type: Function,
    default: null
  },
  onDragLeave: {
    type: Function,
    default: null
  },
  onDragEnd: {
    type: Function,
    default: null
  },
  onSetActiveSelector: {
    type: Function,
    default: null
  },
  onToggleFavorite: {
    type: Function,
    default: null
  },
  onRemoveSelector: {
    type: Function,
    default: null
  }
});

const {
  selector,
  index,
  activeIndex,
  draggedIndex,
  dragOverIndex,
  listLength,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragEnd,
  onSetActiveSelector,
  onToggleFavorite,
  onRemoveSelector
} = props;
</script>

<style scoped lang="scss">
.selector-item {
  display: flex;
  align-items: center;
  padding: 12px 12px 12px 12px;
  gap: 12px;
  cursor: pointer;
  color: var(--color-text-primary);
  position: relative;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  border-radius: 6px;
  margin: 0 12px;

  &.active {
    background: var(--color-primary-background);
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &:hover:not(.active):not(.dragging) {
    background: var(--color-hover-background);
  }

  &.dragging {
    opacity: 0.5;
    transform: rotate(3deg) scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    background: var(--color-primary-background);
    color: white;
  }

  &.drag-over {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
    background: var(--color-hover-background);

    &::before {
      content: '';
      position: absolute;
      top: -4px;
      left: 12px;
      right: 12px;
      height: 2px;
      background: var(--color-primary);
      border-radius: 1px;
      animation: pulse 1s infinite;
    }
  }

  &:hover .delete-selector-btn {
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.7;
    transform: scaleX(0.95);
  }
}

.selector-icon {
  display: flex;
  align-items: center;
  gap: 4px;
}

.star-favorite {
  fill: var(--color-warning, #ffc107);
  stroke: var(--color-warning, #ffc107);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    filter: brightness(1.1);
  }
}

.star-regular {
  fill: none;
  stroke: var(--color-text-secondary, #888);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    fill: var(--color-warning-light, rgba(255, 193, 7, 0.2));
    stroke: var(--color-warning, #ffc107);
    transform: scale(1.1);
  }
}

.drag-handle {
  cursor: grab;
  transition: all 0.2s ease;
  color: var(--color-secondary-text);

  &:hover {
    color: var(--color-primary);
    transform: scale(1.1);
  }

  &:active {
    cursor: grabbing;
    transform: scale(0.95);
  }
}

.selector-item.dragging .drag-handle {
  cursor: grabbing;
  color: white;
}

.selector-name {
  font-size: 14px;
  color: var(--color-primary-text);
  display: flex;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  transition: all 0.2s ease;
}

.delete-selector-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  padding: 4px;
  margin-left: auto;
  border-radius: 3px;

  &:hover {
    color: #ff4757;
    background: rgba(255, 71, 87, 0.1);
    transform: scale(1.1);
  }
}
</style>

