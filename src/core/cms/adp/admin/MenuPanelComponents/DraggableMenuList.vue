<template>
  <div class="draggable-menu-list">
    <SlickList 
      v-model:list="combinedList" 
      axis="y" 
      lockAxis="y"
      :useDragHandle="true"
      @sort-start="onSortStart"
      @sort-end="onSortEnd"
      class="slick-list"
    >
      <SlickItem 
        v-for="(item, index) in combinedList" 
        :key="item._uniqueKey"
        :index="index"
        :class="item._type === 'separator' ? 'slick-item-separator' : 'slick-item'"
      >
        <!-- Разделитель -->
        <div 
          v-if="item._type === 'separator'"
          class="separator-row-inline"
          @click.stop="$emit('edit-separator', getOriginalSeparator(item))"
        >
          <div v-handle class="separator-row-inline__handle">
            <GripVertical :size="14" class="text-muted" />
          </div>
          <div class="separator-row-inline__line"></div>
          <span class="separator-row-inline__label">
            <Minus :size="14" />
            {{ item.name }}
          </span>
          <div class="separator-row-inline__line"></div>
        </div>
        
        <!-- Элемент меню -->
        <DraggableMenuRow
          v-else
          :item="item"
          :level="0"
          :index="index"
          :expand-all-groups="expandAllGroups"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @reorder-children="handleChildrenReorder"
          @toggle-visibility="$emit('toggle-visibility', $event)"
        />
      </SlickItem>
    </SlickList>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { SlickList, SlickItem, HandleDirective as vHandle } from 'vue-slicksort'
import { Minus, GripVertical } from 'lucide-vue-next'
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

const emit = defineEmits(['edit', 'delete', 'reorder', 'reorder-separators', 'toggle-visibility', 'edit-separator'])

// Флаг для предотвращения сброса при перетаскивании
const isDragging = ref(false)

// Объединённый список для drag & drop
const combinedList = ref([])

// Создание объединённого списка из элементов и разделителей
function buildCombinedList(items, separators) {
  const result = []
  
  // Преобразуем элементы меню
  const menuItems = items.map(item => ({
    ...item,
    _type: 'menu_item',
    _uniqueKey: 'menu_' + item.id,
    _sortOrder: item.order
  }))
  
  // Преобразуем разделители (только активные)
  const sepItems = separators
    .filter(sep => sep.is_active)
    .map(sep => ({
      ...sep,
      _type: 'separator',
      _uniqueKey: 'sep_' + sep.id,
      _sortOrder: sep.before_order
    }))
  
  // Объединяем и сортируем
  result.push(...menuItems, ...sepItems)
  result.sort((a, b) => {
    // Сначала сортируем по order
    if (a._sortOrder !== b._sortOrder) {
      return a._sortOrder - b._sortOrder
    }
    // При равных order - разделители идут ПЕРЕД элементами меню
    if (a._type === 'separator' && b._type !== 'separator') return -1
    if (a._type !== 'separator' && b._type === 'separator') return 1
    return 0
  })
  
  return result
}

// Инициализация и синхронизация
watch(
  [() => props.items, () => props.separators],
  ([newItems, newSeparators]) => {
    if (!isDragging.value) {
      combinedList.value = buildCombinedList(newItems, newSeparators)
    }
  },
  { immediate: true, deep: true }
)

// Получить оригинальный разделитель для редактирования
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
    
    // Пересчитываем order для всех элементов
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
    
    // Эмитим события для сохранения
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
}

.slick-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.slick-item {
  background: #fff;
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
    background: #fff;
  }
}

.separator-row-inline {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.5rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-radius: 4px;
  background: #fff;
  border: 1px dashed #17a2b8;
  
  &:hover {
    background-color: rgba(23, 162, 184, 0.08);
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
    background: linear-gradient(90deg, transparent, #17a2b8 20%, #17a2b8 80%, transparent);
  }
  
  &__label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    color: #17a2b8;
    background: rgba(23, 162, 184, 0.1);
    border-radius: 4px;
    white-space: nowrap;
    
    svg {
      flex-shrink: 0;
    }
  }
}
</style>

