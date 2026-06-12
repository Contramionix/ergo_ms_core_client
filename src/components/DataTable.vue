<template>
  <div>
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0" :class="tableClass">
        <thead class="data-table-header">
          <tr>
            <th v-if="showNumberColumn" style="width: 50px;">№</th>
            <th v-for="column in columns" :key="column.key" :class="column.headerClass" :style="column.headerStyle">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in displayItems" :key="getItemKey(item, idx)" :class="getRowClass(item, idx)" @click="handleRowClick(item, idx)">
            <td v-if="showNumberColumn" class="text-muted">{{ displayNumberOffset + idx + 1 }}</td>
            <td v-for="column in columns" :key="column.key" :class="column.cellClass" :style="column.cellStyle">
              <slot :name="`cell-${column.key}`" :item="item" :index="idx" :column="column">
                {{ getCellValue(item, column) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="enablePagination && totalItemsCount > itemsPerPage" class="d-flex justify-content-between align-items-center mt-3">
      <div class="text-muted small">
        Показано {{ startIndex + 1 }} - {{ endIndex }} из {{ totalItemsCount }}
      </div>
      <nav aria-label="Навигация по страницам">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="prevPage" :disabled="currentPage === 1">
              <ChevronLeft :size="16" />
            </button>
          </li>
          <li v-for="(page, idx) in visiblePages" :key="idx" class="page-item" :class="{ active: page === currentPage, disabled: page === '...' }">
            <button v-if="page !== '...'" class="page-link" @click="goToPage(page)">
              {{ page }}
            </button>
            <span v-else class="page-link">...</span>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="nextPage" :disabled="currentPage === totalPages">
              <ChevronRight :size="16" />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  items: {
    type: Array,
    required: true,
    default: () => []
  },
  columns: {
    type: Array,
    required: true,
    default: () => []
  },
  showNumberColumn: {
    type: Boolean,
    default: true
  },
  numberOffset: {
    type: Number,
    default: 0
  },
  tableClass: {
    type: String,
    default: ''
  },
  rowClass: {
    type: [String, Function],
    default: ''
  },
  clickable: {
    type: Boolean,
    default: false
  },
  getItemKey: {
    type: Function,
    default: (item, index) => item?.id ?? index
  },
  // Пагинация
  enablePagination: {
    type: Boolean,
    default: false
  },
  currentPage: {
    type: Number,
    default: 1
  },
  itemsPerPage: {
    type: Number,
    default: 10
  },
  totalItems: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['rowClick', 'update:currentPage', 'pageChange'])

function getCellValue(item, column) {
  if (column.value) {
    return typeof column.value === 'function' ? column.value(item) : item[column.value]
  }
  return item[column.key] ?? ''
}

function getRowClass(item, idx) {
  const classes = []
  
  if (props.clickable) {
    classes.push('table-row-click')
  }
  
  if (typeof props.rowClass === 'function') {
    const customClass = props.rowClass(item, idx)
    if (customClass) classes.push(customClass)
  } else if (props.rowClass) {
    classes.push(props.rowClass)
  }
  
  return classes.join(' ')
}

function handleRowClick(item, idx) {
  if (props.clickable) {
    emit('rowClick', item, idx)
  }
}

// Пагинация
const totalItemsCount = computed(() => {
  return props.totalItems !== null ? props.totalItems : props.items.length
})

const totalPages = computed(() => {
  return Math.ceil(totalItemsCount.value / props.itemsPerPage) || 1
})

const displayItems = computed(() => {
  if (!props.enablePagination) {
    return props.items
  }
  if (props.totalItems !== null) {
    return props.items
  }
  const start = (props.currentPage - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return props.items.slice(start, end)
})

const displayNumberOffset = computed(() => {
  if (!props.enablePagination) {
    return props.numberOffset
  }
  return props.numberOffset + (props.currentPage - 1) * props.itemsPerPage
})

const startIndex = computed(() => {
  return (props.currentPage - 1) * props.itemsPerPage
})

const endIndex = computed(() => {
  return Math.min(props.currentPage * props.itemsPerPage, totalItemsCount.value)
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = props.currentPage
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    }
  }
  return pages
})

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:currentPage', page)
    emit('pageChange', page)
  }
}

const prevPage = () => {
  if (props.currentPage > 1) {
    const newPage = props.currentPage - 1
    emit('update:currentPage', newPage)
    emit('pageChange', newPage)
  }
}

const nextPage = () => {
  if (props.currentPage < totalPages.value) {
    const newPage = props.currentPage + 1
    emit('update:currentPage', newPage)
    emit('pageChange', newPage)
  }
}
</script>

<style lang="scss" scoped>
.data-table-header {
  background-color: var(--color-secondary-background);
}

.table-row-click {
  cursor: pointer;
  
  &:hover {
    background-color: var(--color-hover-background);
  }
}

@media (max-width: 768px) {
  .table-responsive {
    font-size: 0.875rem;
  }
}

.pagination {
  gap: 0.25rem;
}

.pagination .page-link {
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  color: #495057;
  border-color: #dee2e6;
  min-width: 36px;
  height: 31px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none !important;
}

.pagination .page-item.active .page-link {
  background-color: #0d6efd;
  border-color: #0d6efd;
  color: white;
}

.pagination .page-item.disabled .page-link {
  color: #adb5bd;
  pointer-events: none;
}

.pagination .page-link:hover:not(.disabled) {
  background-color: #e9ecef;
  border-color: #dee2e6;
}
</style>
