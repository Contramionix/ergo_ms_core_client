<template>
  <div class="menu-row-wrapper" :class="{ 'menu-row-wrapper--nested': level > 0, 'menu-row-wrapper--no-children': level > 0 && !hasChildren }">
    <!-- Основной элемент -->
    <div 
      class="menu-row" 
      :class="{ 
        'menu-row--nested': level > 0,
        'menu-row--expanded': isExpanded && hasChildren
      }"
    >
      <!-- Drag Handle -->
      <div v-handle class="menu-row__handle">
        <GripVertical :size="16" class="text-muted" />
      </div>
      
      <!-- Иконка разворачивания -->
      <div v-if="hasChildren" class="menu-row__expand" @click="toggleExpand">
        <ChevronRight 
          :size="16" 
          class="expand-icon"
          :class="{ 'expand-icon--rotated': isExpanded }"
        />
      </div>
      
      <!-- Тип элемента -->
      <div class="menu-row__type">
        <span class="badge" :class="itemTypeBadgeClass">
          {{ itemTypeLabel }}
        </span>
      </div>
      
      <!-- Иконка элемента -->
      <div v-if="item.icon && iconComponent" class="menu-row__icon">
        <component 
          :is="iconComponent" 
          :size="18" 
          class="text-muted"
        />
      </div>
      
      <!-- Название -->
      <div class="menu-row__name">
        {{ item.name }}
        <small v-if="item.route_name" class="text-muted ms-2">
          ({{ item.route_name }})
        </small>
      </div>
      
      <!-- Действия -->
      <div class="menu-row__actions">
        <button
          class="menu-row__visibility-btn"
          :class="{ 'menu-row__visibility-btn--hidden': !item.is_active }"
          @click.stop="toggleVisibility"
          :title="item.is_active ? 'Скрыть элемент' : 'Показать элемент'"
        >
          <Eye v-if="item.is_active" :size="20" />
          <EyeOff v-else :size="20" />
        </button>
        <button 
          class="menu-row__action-btn menu-row__action-btn--edit"
          @click.stop="$emit('edit', item)"
          title="Редактировать"
        >
          <Settings :size="20" class="menu-row__settings-icon" />
        </button>
        <button 
          class="menu-row__action-btn menu-row__action-btn--delete"
          @click.stop="$emit('delete', item)"
          title="Удалить"
        >
          <Trash :size="20" />
        </button>
      </div>
    </div>
    
    <!-- Дочерние элементы -->
    <div v-if="hasChildren && isExpanded" class="menu-row__children">
      <SlickList 
        v-model:list="localChildren" 
        axis="y" 
        lockAxis="y"
        :useDragHandle="true"
        @sort-start="onSortStart"
        @sort-end="onChildrenReorder"
        class="children-list"
      >
        <SlickItem 
          v-for="(child, childIndex) in localChildren" 
          :key="child.id" 
          :index="childIndex"
          class="child-item"
        >
          <DraggableMenuRow
            :item="child"
            :level="level + 1"
            :index="childIndex"
            :expand-all-groups="expandAllGroups"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
            @reorder-children="$emit('reorder-children', $event)"
            @toggle-visibility="$emit('toggle-visibility', $event)"
          />
        </SlickItem>
      </SlickList>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, shallowRef, nextTick } from 'vue'
import { SlickList, SlickItem, HandleDirective as vHandle } from 'vue-slicksort'
import { 
  GripVertical, 
  ChevronRight, 
  Settings, 
  Trash,
  Eye,
  EyeOff
} from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  index: {
    type: Number,
    default: 0
  },
  expandAllGroups: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'reorder-children', 'toggle-visibility'])

// Флаг для предотвращения сброса при перетаскивании
const isDragging = ref(false)

// Локальная копия детей для drag & drop
const localChildren = ref([])

// Проверка наличия детей
const hasChildren = computed(() => {
  return props.item.children && props.item.children.length > 0
})

// Состояние раскрытия
const isExpanded = ref(false)

// Инициализация и обновление состояния раскрытия на основе настройки
watch(
  [() => props.expandAllGroups, hasChildren],
  ([expandAll, hasChildren]) => {
    if (hasChildren) {
      isExpanded.value = expandAll
    }
  },
  { immediate: true }
)

// Синхронизация детей (как в EditorCanvas - синхронизация только когда не происходит drag)
watch(
  () => props.item.children,
  (newChildren) => {
    if (!isDragging.value && newChildren) {
      localChildren.value = [...newChildren]
    }
  },
  { immediate: true, deep: true }
)

// Динамическая загрузка иконки
const iconComponent = shallowRef(null)

watch(() => props.item.icon, (iconName) => {
  if (iconName && LucideIcons[iconName]) {
    iconComponent.value = LucideIcons[iconName]
  } else {
    iconComponent.value = null
  }
}, { immediate: true })

// Метки типов элементов
const itemTypeLabels = {
  route: 'Маршрут',
  group: 'Группа',
  offcanvas: 'Панель',
  external: 'Внешняя'
}

const itemTypeLabel = computed(() => {
  return itemTypeLabels[props.item.item_type] || props.item.item_type
})

const itemTypeBadgeClass = computed(() => {
  const classes = {
    route: 'bg-primary',
    group: 'bg-info',
    offcanvas: 'bg-warning text-dark',
    external: 'bg-secondary'
  }
  return classes[props.item.item_type] || 'bg-light text-dark'
})

// Переключение раскрытия
function toggleExpand() {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value
  }
}

// Начало перетаскивания
function onSortStart() {
  isDragging.value = true
}

// Обработка изменения порядка детей
function onChildrenReorder() {
  // Ждём пока vue-slicksort обновит массив через v-model:list
  nextTick(() => {
    const reorderedItems = localChildren.value.map((child, index) => ({
      id: child.id,
      order: index * 10,
      parent_id: props.item.id
    }))
    
    emit('reorder-children', reorderedItems)
    isDragging.value = false
  })
}

// Переключение видимости элемента
function toggleVisibility() {
  emit('toggle-visibility', {
    id: props.item.id,
    is_active: !props.item.is_active
  })
}
</script>

<style lang="scss" scoped>
.menu-row-wrapper {
  width: 100%;
  
  &--nested {
    padding-left: 2rem;
    
    &.menu-row-wrapper--no-children {
      padding-left: 0;
    }
  }
}

.menu-row {
  display: flex;
  align-items: center;
  padding: 0.75rem 0.5rem;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  gap: 0.5rem;
  transition: background-color 0.15s ease;
  
  &:hover {
    background-color: #f8f9fa;
  }
  
  &--nested {
    background: #fafafa;
  }
  
  &--expanded {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  
  &__handle {
    cursor: grab;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    
    &:active {
      cursor: grabbing;
    }
  }
  
  &__order {
    min-width: 40px;
    text-align: center;
  }
  
  &__expand {
    width: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
  }
  
  &__name {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  &__type {
    display: flex;
    align-items: center;
  }
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    overflow: hidden;
  }
  
  &__visibility-btn {
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6c757d;
    opacity: 0;
    transition: opacity 0.3s ease, color 0.3s ease;
    flex-shrink: 0;
    
    &:hover {
      color: #495057;
    }
    
    &--hidden {
      opacity: 1;
      color: #dc3545;
      
      &:hover {
        color: #c82333;
      }
    }
  }
  
  &__action-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6c757d;
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    transition: opacity 0.3s ease, color 0.3s ease, max-width 0.3s ease, padding 0.3s ease;
    flex-shrink: 0;
    
    &--edit {
      &:hover {
        color: #0d6efd;
        
        .menu-row__settings-icon {
          transform: rotate(180deg);
        }
      }
    }
    
    &--delete {
      &:hover {
        color: #dc3545;
      }
    }
  }
  
  &:hover {
    .menu-row__visibility-btn {
      opacity: 1;
    }
    
    .menu-row__action-btn {
      opacity: 1;
      max-width: 28px;
      padding: 0.25rem;
    }
  }
  
  &__children {
    border: 1px solid #e9ecef;
    border-top: none;
    border-radius: 0 0 4px 4px;
    padding: 0.5rem;
    background: #f8f9fa;
  }
}

.expand-icon {
  transition: transform 0.2s ease;
  
  &--rotated {
    transform: rotate(90deg);
  }
}

.menu-row__settings-icon {
  transition: transform 0.5s ease;
  transform: rotate(0deg);
}

.children-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.child-item {
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.SortableHelper {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    z-index: 1000;
  }
}
</style>

