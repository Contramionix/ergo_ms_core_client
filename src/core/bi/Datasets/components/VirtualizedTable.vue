<template>
  <div class="virtualized-table-wrapper" ref="wrapperRef">
    <div class="virtualized-table-header" ref="headerRef">
      <table class="table table-hover table-sm mb-0">
        <thead>
          <tr>
            <th
              v-for="(col, idx) in columns"
              :key="idx"
              :style="{ width: col.width || 'auto', minWidth: col.minWidth || '100px' }"
              class="table-header-cell"
            >
              <div class="header-content">
                {{ col.title }}
                <span v-if="col.sortable" class="sort-indicator" @click="handleSort(col)">
                  <ChevronUp v-if="sortColumn === col.field && sortDirection === 'asc'" :size="14" />
                  <ChevronDown v-else-if="sortColumn === col.field && sortDirection === 'desc'" :size="14" />
                  <ChevronsUpDown v-else :size="14" />
                </span>
              </div>
            </th>
          </tr>
        </thead>
      </table>
    </div>
    <div
      class="virtualized-table-body"
      ref="bodyRef"
      @scroll="handleScroll"
      :style="{ height: containerHeight + 'px' }"
    >
      <div :style="{ height: totalHeight + 'px', position: 'relative' }">
        <div :style="{ transform: `translateY(${offsetY}px)` }">
          <table class="table table-hover table-sm mb-0">
            <tbody>
              <tr
                v-for="(row, idx) in visibleRows"
                :key="startIndex + idx"
                :class="{ 'table-active': selectedRowIndex === startIndex + idx }"
                @click="handleRowClick(startIndex + idx, row)"
                :style="{ height: rowHeight + 'px' }"
              >
                <td
                  v-for="(col, colIdx) in columns"
                  :key="colIdx"
                  :style="{ width: col.width || 'auto', minWidth: col.minWidth || '100px' }"
                >
                  {{ getCellValue(row, col.field) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div v-if="loading" class="virtualized-table-loading">
      <div class="spinner-border spinner-border-sm" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-vue-next'

const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  rows: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  rowHeight: {
    type: Number,
    default: 40
  },
  overscan: {
    type: Number,
    default: 5
  }
})

const emit = defineEmits(['row-click', 'sort', 'scroll-end'])

const wrapperRef = ref(null)
const headerRef = ref(null)
const bodyRef = ref(null)

const containerHeight = ref(400)
const scrollTop = ref(0)
const sortColumn = ref(null)
const sortDirection = ref(null)
const selectedRowIndex = ref(null)

// Вычисляем видимые строки
const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.rowHeight)
  return Math.max(0, index - props.overscan)
})

const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / props.rowHeight)
  const index = startIndex.value + visibleCount + props.overscan * 2
  return Math.min(props.rows.length, index)
})

const visibleRows = computed(() => {
  return props.rows.slice(startIndex.value, endIndex.value)
})

const totalHeight = computed(() => {
  return props.rows.length * props.rowHeight
})

const offsetY = computed(() => {
  return startIndex.value * props.rowHeight
})

// Обработка скролла
function handleScroll(event) {
  scrollTop.value = event.target.scrollTop
  
  // Синхронизируем горизонтальный скролл заголовка
  if (headerRef.value) {
    headerRef.value.scrollLeft = event.target.scrollLeft
  }
  
  // Проверяем, достигли ли конца таблицы
  const element = event.target
  const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight
  
  // Если осталось менее 100px до конца, загружаем следующую страницу
  if (scrollBottom < 100 && props.rows.length > 0) {
    emit('scroll-end')
  }
}

// Обработка клика по строке
function handleRowClick(index, row) {
  selectedRowIndex.value = index
  emit('row-click', { index, row })
}

// Обработка сортировки
function handleSort(col) {
  if (!col.sortable) return
  
  if (sortColumn.value === col.field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = col.field
    sortDirection.value = 'asc'
  }
  
  emit('sort', { column: col.field, direction: sortDirection.value })
}

// Получение значения ячейки
function getCellValue(row, field) {
  if (typeof row === 'object' && row !== null) {
    return row[field] ?? ''
  }
  return ''
}

// Обновление высоты контейнера
function updateContainerHeight() {
  if (wrapperRef.value && bodyRef.value) {
    const wrapperRect = wrapperRef.value.getBoundingClientRect()
    const headerRect = headerRef.value?.getBoundingClientRect()
    const headerHeight = headerRect?.height || 0
    containerHeight.value = wrapperRect.height - headerHeight
  }
}

// Resize observer для отслеживания изменения размера
let resizeObserver = null

onMounted(() => {
  updateContainerHeight()
  
  if (window.ResizeObserver && wrapperRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerHeight()
    })
    resizeObserver.observe(wrapperRef.value)
  }
  
  // Синхронизация горизонтального скролла
  if (bodyRef.value && headerRef.value) {
    bodyRef.value.addEventListener('scroll', () => {
      if (headerRef.value) {
        headerRef.value.scrollLeft = bodyRef.value.scrollLeft
      }
    })
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

watch(() => props.rows.length, () => {
  nextTick(() => {
    updateContainerHeight()
  })
})
</script>

<style scoped lang="scss">
.virtualized-table-wrapper {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  max-height: 100%;
}

.virtualized-table-header {
  flex: 0 0 auto;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 2px solid var(--color-border, #dee2e6);
  min-height: 0;
  
  table {
    width: 100%;
    table-layout: fixed;
  }
}

.virtualized-table-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  
  table {
    width: 100%;
    table-layout: fixed;
  }
  
  tbody tr {
    cursor: pointer;
    transition: background-color 0.15s ease;
    
    &:hover {
      background-color: var(--color-hover-background, #f8f9fa);
    }
    
    &.table-active {
      background-color: var(--color-primary, #007bff);
      color: white;
    }
  }
}

.table-header-cell {
  position: relative;
  user-select: none;
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    
    .sort-indicator {
      cursor: pointer;
      display: flex;
      align-items: center;
      opacity: 0.5;
      transition: opacity 0.2s;
      
      &:hover {
        opacity: 1;
      }
    }
  }
}

.virtualized-table-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  padding: 1rem;
  border-radius: 4px;
}

// Адаптивность для мобильных устройств
@media (max-width: 768px) {
  .virtualized-table-header,
  .virtualized-table-body {
    font-size: 0.875rem;
  }
  
  .table-header-cell .header-content {
    padding: 0.25rem;
  }
}
</style>

