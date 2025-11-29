<template>
  <div class="draggable-menu-list">
    <SlickList 
      v-model:list="localItems" 
      axis="y" 
      lockAxis="y"
      :useDragHandle="true"
      @sort-start="onSortStart"
      @sort-end="onSortEnd"
      class="slick-list"
    >
      <SlickItem 
        v-for="(item, index) in localItems" 
        :key="item.id" 
        :index="index"
        class="slick-item"
      >
        <DraggableMenuRow
          :item="item"
          :level="0"
          :index="index"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @reorder-children="handleChildrenReorder"
        />
      </SlickItem>
    </SlickList>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { SlickList, SlickItem } from 'vue-slicksort'
import DraggableMenuRow from './DraggableMenuRow.vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete', 'reorder'])

// Локальная копия для drag & drop (как internalTree в EditorCanvas)
const localItems = ref([...props.items])

// Флаг для предотвращения сброса при перетаскивании
const isDragging = ref(false)

// Синхронизация с props.items (только когда не происходит drag)
watch(
  () => props.items,
  (newItems) => {
    if (!isDragging.value) {
      localItems.value = [...newItems]
    }
  },
  { deep: true }
)

function onSortEnd() {
  // Ждём пока vue-slicksort обновит массив через v-model:list
  nextTick(() => {
    const reorderedItems = localItems.value.map((item, index) => ({
      id: item.id,
      order: index * 10
    }))
    emit('reorder', reorderedItems)
    isDragging.value = false
  })
}

function onSortStart() {
  isDragging.value = true
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
</style>

