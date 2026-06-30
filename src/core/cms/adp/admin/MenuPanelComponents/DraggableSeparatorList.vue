<template>
  <div class="separator-list">
    <SlickList 
      v-model:list="localSeparators" 
      axis="y" 
      lockAxis="y"
      :useDragHandle="true"
      @sort-start="onSortStart"
      @sort-end="onSortEnd"
      class="slick-list"
    >
      <SlickItem 
        v-for="(sep, index) in localSeparators" 
        :key="sep.id" 
        :index="index"
        class="separator-item"
      >
        <div class="separator-row">
          <!-- Drag Handle -->
          <div v-handle class="separator-row__handle">
            <GripVertical :size="16" class="text-muted" />
          </div>
          
          <!-- Порядок -->
          <div class="separator-row__order">
            <span class="badge bg-light text-dark">{{ sep.before_order }}</span>
          </div>
          
          <!-- Иконка разделителя -->
          <div class="separator-row__icon">
            <Minus :size="18" class="text-info" />
          </div>
          
          <!-- Название -->
          <div class="separator-row__name">
            {{ sep.name }}
          </div>
          
          <!-- Статус -->
          <div class="separator-row__status">
            <span 
              class="badge" 
              :class="sep.is_active ? 'bg-success' : 'bg-secondary'"
            >
              {{ sep.is_active ? 'Активен' : 'Неактивен' }}
            </span>
          </div>
          
          <!-- Действия -->
          <div class="separator-row__actions">
            <button 
              class="btn btn-sm btn-outline-primary me-1" 
              @click.stop="$emit('edit', sep)"
              title="Редактировать"
            >
              <Edit :size="14" />
            </button>
            <button 
              class="btn btn-sm btn-outline-danger" 
              @click.stop="$emit('delete', sep)"
              title="Удалить"
            >
              <Trash :size="14" />
            </button>
          </div>
        </div>
      </SlickItem>
    </SlickList>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { SlickList, SlickItem, HandleDirective as vHandle } from 'vue-slicksort'
import { GripVertical, Minus, Edit, Trash } from 'lucide-vue-next'

const props = defineProps({
  separators: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete', 'reorder'])

// Локальная копия для drag & drop (как в EditorCanvas)
const localSeparators = ref([...props.separators])

// Флаг для предотвращения сброса при перетаскивании
const isDragging = ref(false)

// Синхронизация с props.separators (только когда не происходит drag)
watch(
  () => props.separators,
  (newSeparators) => {
    if (!isDragging.value) {
      localSeparators.value = [...newSeparators]
    }
  },
  { deep: true }
)

function onSortStart() {
  isDragging.value = true
}

function onSortEnd() {
  // Ждём пока vue-slicksort обновит массив через v-model:list
  nextTick(() => {
    const reorderedSeparators = localSeparators.value.map((sep, index) => ({
      id: sep.id,
      before_order: index * 10
    }))
    
    emit('reorder', reorderedSeparators)
    isDragging.value = false
  })
}
</script>

<style lang="scss" scoped>
.separator-list {
  width: 100%;
}

.slick-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.separator-item {
  margin-bottom: 4px;
  
  &.SortableHelper {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    z-index: 1000;
  }
}

.separator-row {
  display: flex;
  align-items: center;
  padding: 0.75rem 0.5rem;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  gap: 0.75rem;
  transition: background-color 0.15s ease;
  
  &:hover {
    background-color: var(--color-hover-background);
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
    min-width: 60px;
    text-align: center;
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
    font-weight: 500;
  }
  
  &__status {
    min-width: 100px;
  }
  
  &__actions {
    display: flex;
    gap: 0.25rem;
  }
}
</style>

