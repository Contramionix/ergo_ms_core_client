<template>
  <div class="draggable-menu-list" :class="{ 'draggable-menu-list--dragging': isDragging }">
    <SlickList v-model:list="combinedList" axis="y" lockAxis="y" :useDragHandle="true" @sort-start="onSortStart" @sort-end="onSortEnd" class="slick-list">
      <SlickItem v-for="(item, index) in combinedList" :key="item._uniqueKey" :index="index" :class="item._type === 'separator' ? 'slick-item-separator' : 'slick-item'">
        <div v-if="item._type === 'separator'" class="separator-row-inline" :class="{ 'separator-row-inline--inactive': !item.is_active }">
          <div v-handle class="separator-row-inline__handle">
            <GripVertical :size="14" class="text-muted" />
          </div>
          <div class="separator-row-inline__line"></div>
          <span class="separator-row-inline__label" @click.stop="$emit('edit-separator', getOriginalSeparator(item))">
            <Minus :size="14" />{{ item.name }}
          </span>
          <div class="separator-row-inline__line"></div>
          
          <div class="separator-row-inline__actions-wrapper">
            <div class="separator-row-inline__actions">
            <button class="separator-row-inline__visibility-btn" :class="{ 'separator-row-inline__visibility-btn--hidden': !item.is_active }" @click.stop="$emit('toggle-visibility-separator', getOriginalSeparator(item))" :title="item.is_active ? 'Скрыть разделитель' : 'Показать разделитель'">
              <Eye v-if="item.is_active" :size="20" />
              <EyeOff v-else :size="20" />
            </button>
            <button  class="separator-row-inline__action-btn separator-row-inline__action-btn--edit" @click.stop="$emit('edit-separator', getOriginalSeparator(item))" title="Редактировать">
              <Settings :size="20" class="separator-row-inline__settings-icon" />
            </button>
            <button class="separator-row-inline__action-btn separator-row-inline__action-btn--delete" @click.stop="$emit('delete-separator', getOriginalSeparator(item))" title="Удалить">
              <Trash :size="20" />
            </button>
            </div>
          </div>
        </div>
        
        <DraggableMenuRow v-else :item="item" :level="0" :index="index" :expand-all-groups="expandAllGroups" @edit="$emit('edit', $event)" @delete="$emit('delete', $event)" @reorder-children="handleChildrenReorder" @toggle-visibility="$emit('toggle-visibility', $event)"/>
      </SlickItem>
    </SlickList>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { SlickList, SlickItem, HandleDirective as vHandle } from 'vue-slicksort'
import { Minus, GripVertical, Settings, Trash, Eye, EyeOff } from 'lucide-vue-next'
import DraggableMenuRow from './DraggableMenuRow.vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  separators: {
    type: Array,
    default: () => []
  },
  expandAllGroups: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'reorder', 'reorder-separators', 'toggle-visibility', 'edit-separator', 'delete-separator', 'toggle-visibility-separator'])

const isDragging = ref(false)
const combinedList = ref([])

function buildCombinedList(items, separators) {
  const result = []
  
  const menuItems = items.map(item => ({
    ...item,
    _type: 'menu_item',
    _uniqueKey: 'menu_' + item.id,
    _sortOrder: item.order
  }))
  
  const sepItems = separators
    .map(sep => ({
      ...sep,
      _type: 'separator',
      _uniqueKey: 'sep_' + sep.id,
      _sortOrder: sep.before_order
    }))
  
  result.push(...menuItems, ...sepItems)
  result.sort((a, b) => {
    if (a._sortOrder !== b._sortOrder) {
      return a._sortOrder - b._sortOrder
    }
    if (a._type === 'separator' && b._type !== 'separator') return -1
    if (a._type !== 'separator' && b._type === 'separator') return 1
    return 0
  })
  
  return result
}

watch(
  [() => props.items, () => props.separators],
  ([newItems, newSeparators]) => {
    if (!isDragging.value) {
      combinedList.value = buildCombinedList(newItems, newSeparators)
    }
  },
  { immediate: true, deep: true }
)

function getOriginalSeparator(item) {
  return props.separators.find(sep => sep.id === item.id)
}

function onSortStart() {
  isDragging.value = true
}

function onSortEnd() {
  nextTick(() => {
    const reorderedMenuItems = []
    const reorderedSeparators = []
    
    combinedList.value.forEach((item, index) => {
      const newOrder = index * 10
      
      if (item._type === 'menu_item') {
        reorderedMenuItems.push({
          id: item.id,
          order: newOrder
        })
      } else if (item._type === 'separator') {
        reorderedSeparators.push({
          id: item.id,
          before_order: newOrder
        })
      }
    })
    
    if (reorderedMenuItems.length > 0) {
      emit('reorder', reorderedMenuItems)
    }
    if (reorderedSeparators.length > 0) {
      emit('reorder-separators', reorderedSeparators)
    }
    
    isDragging.value = false
  })
}

function handleChildrenReorder(data) {
  emit('reorder', data)
}
</script>

<style lang="scss" scoped>
.draggable-menu-list {
  width: 100%;

  &.draggable-menu-list--dragging {
    user-select: none;
  }
}

.slick-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.slick-item {
  background: var(--color-primary-background);
  margin-bottom: 2px;
  
  &.SortableHelper {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    z-index: 1000;
  }
}

.slick-item-separator {
  margin-bottom: 2px;
  
  &.SortableHelper {
    box-shadow: 0 4px 12px rgba(23, 162, 184, 0.25);
    border-radius: 4px;
    z-index: 1000;
    background: var(--color-primary-background);
  }
}

.separator-row-inline {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.75rem 0.5rem;
  transition: background-color 0.15s ease;
  border-radius: 4px;
  background: var(--color-primary-background);
  border: 1px dashed var(--bs-info);
  min-height: 48px;
  
  &:hover {
    background-color: var(--color-hover-background);
  }
  
  &__handle {
    cursor: grab;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    margin-right: 0.25rem;
    
    &:active {
      cursor: grabbing;
    }
  }
  
  &__line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--bs-info) 20%, var(--bs-info) 80%, transparent);
  }
  
  &__label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    color: var(--bs-info);
    background: var(--bs-info-bg-subtle);
    border-radius: 4px;
    white-space: nowrap;
    cursor: pointer;
    
    &:hover {
      background: var(--bs-info-border-subtle);
    }
    
    svg {
      flex-shrink: 0;
    }
  }
  
  &__actions-wrapper {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
  }
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  &__visibility-btn {
    background: none;
    border: none;
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary-text);
    opacity: 0;
    width: 0;
    min-width: 0;
    overflow: hidden;
    margin: 0;
    transition: opacity 0.3s ease, color 0.3s ease, width 0.3s ease, padding 0.3s ease, margin 0.3s ease;
    flex-shrink: 0;
    height: 28px;
    
    &:hover {
      color: var(--bs-danger);
    }
    
    &--hidden {
      opacity: 1;
      color: var(--bs-danger);
      width: 28px;
      padding: 0.25rem;
      
      &:hover {
        color: var(--bs-danger);
        filter: brightness(0.9);
      }
    }
  }
  
  &__action-btn {
    background: none;
    border: none;
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary-text);
    opacity: 0;
    width: 0;
    min-width: 0;
    overflow: hidden;
    margin: 0;
    transition: opacity 0.3s ease, color 0.3s ease, width 0.3s ease, padding 0.3s ease, margin 0.3s ease;
    flex-shrink: 0;
    height: 28px;
    
    &--edit {
      &:hover {
        color: var(--bs-primary);
        
        .separator-row-inline__settings-icon {
          transform: rotate(180deg);
        }
      }
    }
    
    &--delete {
      &:hover {
        color: var(--bs-danger);
      }
    }
  }
  
  &--inactive {
    position: relative;
    
    .separator-row-inline__handle svg,
    .separator-row-inline__line,
    .separator-row-inline__label {
      opacity: 0.5;
      filter: grayscale(50%);
    }
    
    .separator-row-inline__label {
      color: var(--color-secondary-text);
      background: var(--color-secondary-background);
    }
    
    .separator-row-inline__line {
      background: linear-gradient(90deg, transparent, var(--color-secondary-text) 20%, var(--color-secondary-text) 80%, transparent);
    }
    
    .separator-row-inline__action-btn {
      margin: 0 !important;
    }
    
    .separator-row-inline__visibility-btn,
    .separator-row-inline__action-btn {
      opacity: 1 !important;
      filter: none !important;
      
      svg {
        opacity: 1 !important;
        filter: none !important;
      }
    }
    
    .separator-row-inline__actions-wrapper,
    .separator-row-inline__actions {
      opacity: 1 !important;
    }
    
    &:hover {
      .separator-row-inline__actions {
        gap: 0.25rem;
      }
    }
  }
  
  &:hover {
    .separator-row-inline__visibility-btn {
      opacity: 1;
      width: 28px;
      padding: 0.25rem;
    }
    
    .separator-row-inline__action-btn {
      opacity: 1;
      width: 28px;
      padding: 0.25rem;
    }
  }
}

.separator-row-inline__settings-icon {
  transition: transform 0.5s ease;
  transform: rotate(0deg);
}
</style>