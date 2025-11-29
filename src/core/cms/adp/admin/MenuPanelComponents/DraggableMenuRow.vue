<template>
  <div class="menu-row-wrapper">
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
      <div class="menu-row__expand" @click="toggleExpand">
        <ChevronRight 
          v-if="hasChildren" 
          :size="16" 
          class="expand-icon"
          :class="{ 'expand-icon--rotated': isExpanded }"
        />
        <span v-else style="width: 16px; display: inline-block;"></span>
      </div>
      
      <!-- Иконка элемента -->
      <div class="menu-row__icon">
        <component 
          v-if="item.icon && iconComponent" 
          :is="iconComponent" 
          :size="18" 
          class="text-muted"
        />
        <FileText v-else :size="18" class="text-muted" />
      </div>
      
      <!-- Название -->
      <div class="menu-row__name">
        {{ item.name }}
        <small v-if="item.route_name" class="text-muted ms-2">
          ({{ item.route_name }})
        </small>
      </div>
      
      <!-- Тип элемента -->
      <div class="menu-row__type">
        <span class="badge" :class="itemTypeBadgeClass">
          {{ itemTypeLabel }}
        </span>
      </div>
      
      <!-- Статус -->
      <div class="menu-row__status">
        <span 
          class="badge" 
          :class="item.is_active ? 'bg-success' : 'bg-secondary'"
        >
          {{ item.is_active ? 'Активен' : 'Неактивен' }}
        </span>
        <span v-if="item.is_admin_only" class="badge bg-warning ms-1">
          Админ
        </span>
      </div>
      
      <!-- Действия -->
      <div class="menu-row__actions">
        <button 
          class="btn btn-sm btn-outline-primary me-1" 
          @click.stop="$emit('edit', item)"
          title="Редактировать"
        >
          <Edit :size="14" />
        </button>
        <button 
          class="btn btn-sm btn-outline-danger" 
          @click.stop="$emit('delete', item)"
          title="Удалить"
        >
          <Trash :size="14" />
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
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
            @reorder-children="$emit('reorder-children', $event)"
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
  FileText, 
  Edit, 
  Trash 
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
  }
})

const emit = defineEmits(['edit', 'delete', 'reorder-children'])

// Состояние раскрытия
const isExpanded = ref(true)

// Флаг для предотвращения сброса при перетаскивании
const isDragging = ref(false)

// Локальная копия детей для drag & drop
const localChildren = ref([])

// Проверка наличия детей
const hasChildren = computed(() => {
  return props.item.children && props.item.children.length > 0
})

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
</script>

<style lang="scss" scoped>
.menu-row-wrapper {
  width: 100%;
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
    margin-left: 2rem;
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
    min-width: 80px;
    text-align: center;
  }
  
  &__status {
    min-width: 120px;
    display: flex;
    gap: 0.25rem;
  }
  
  &__actions {
    display: flex;
    gap: 0.25rem;
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

