<template>
  <div class="widget-settings-left-side">
    <h5 class="widget-settings-left-side-title">Селекторы</h5>
    <div class="selectors-list">
      <transition-group name="selector-list" tag="div" class="selectors-container">
        <SelectorListItem
          v-for="(selector, index) in selectorsList"
          :key="selector.id"
          :selector="selector"
          :index="index"
          :active-index="activeSelectorIndex"
          :dragged-index="draggedIndex"
          :drag-over-index="dragOverIndex"
          :list-length="selectorsList.length"
          :on-drag-start="onDragStart"
          :on-drag-over="onDragOver"
          :on-drop="onDrop"
          :on-drag-enter="onDragEnter"
          :on-drag-leave="onDragLeave"
          :on-drag-end="onDragEnd"
          :on-set-active-selector="onSetActiveSelector"
          :on-toggle-favorite="onToggleFavorite"
          :on-remove-selector="onRemoveSelector"
        />
      </transition-group>
      <button class="add-selector-btn" @click="onAddSelector && onAddSelector()"><Plus size="16" class="plus-icon" />Добавить селектор</button>
    </div>
    <button class="advanced-settings-btn" @click="onOpenAdvancedSettings && onOpenAdvancedSettings()"><Settings size="16" class="settings-icon" />Расширенные настройки</button>
  </div>
</template>

<script setup>
import { Settings, Plus } from 'lucide-vue-next';
import SelectorListItem from './SelectorListItem.vue';

const props = defineProps({
  selectorsList: {
    type: Array,
    required: true
  },
  activeSelectorIndex: {
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
  },
  onAddSelector: {
    type: Function,
    default: null
  },
  onOpenAdvancedSettings: {
    type: Function,
    default: null
  }
});

const {
  selectorsList,
  activeSelectorIndex,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragEnd,
  onSetActiveSelector,
  onToggleFavorite,
  onRemoveSelector,
  onAddSelector,
  onOpenAdvancedSettings
} = props;
</script>

<style scoped lang="scss">
.widget-settings-left-side {
  max-width: 255px;
  min-width: 255px;
  min-height: 300px;
  height: 100%;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  background-color: var(--color-background);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: visible;
}

.widget-settings-left-side-title {
  padding: 24px 24px 0 24px;
}

.selectors-list {
  display: flex;
  padding-top: 12px;
  padding-bottom: 12px;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: visible;
}

.selectors-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: visible;
  min-height: 0;
}

.selector-list-move {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.selector-list-enter-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.selector-list-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: absolute;
  width: calc(100% - 24px);
  margin: 0 12px;
}

.selector-list-enter-from {
  opacity: 0;
  transform: translateX(-20px) scale(0.95);
}

.selector-list-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.95);
}

.add-selector-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 2px dashed var(--color-border);
  border-radius: 6px;
  background: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  margin: 8px 12px 0 12px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.05);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.15);
  }

  &:active {
    transform: translateY(0);
  }
}

.plus-icon {
  font-size: 12px;
  transition: transform 0.2s ease;
}

.add-selector-btn:hover .plus-icon {
  transform: rotate(90deg);
}

.advanced-settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  margin: 0 12px 24px 12px;
  transition: all 0.2s ease;
  border-radius: 0.5rem;
  font-weight: 400;

  &:hover {
    color: var(--color-primary);
    background-color: var(--color-hover-background);

    .settings-icon {
      transform: rotate(180deg);
    }
  }
}

.settings-icon {
  transition: transform 0.3s ease;
}
</style>

