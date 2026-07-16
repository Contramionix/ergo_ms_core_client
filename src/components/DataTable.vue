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
          <tr v-if="!displayItems.length" class="data-table-empty-row">
            <td :colspan="totalColumnCount" class="data-table-empty-cell">
              <slot name="empty">{{ emptyText }}</slot>
            </td>
          </tr>
          <tr v-for="(item, idx) in displayItems" v-else :key="getItemKey(item, idx)" :class="getRowClass(item, idx)" @click="handleRowClick(item, idx)">
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
    <div v-if="enablePagination && showPaginationControls" class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
      <div class="text-muted small">
        <template v-if="useFullPagination || hasKnownTotal">
          Показано {{ startIndex + 1 }} – {{ endIndex }} из {{ totalItemsCount }}
        </template>
        <template v-else-if="useSimpleServerPagination">
          <template v-if="displayItems.length">
            Показано {{ startIndex + 1 }} – {{ startIndex + displayItems.length }}
          </template>
          <template v-else>Записей на странице нет</template>
          <span class="data-table-page-label">· Страница {{ currentPage }}</span>
        </template>
        <template v-else>
          Показано {{ startIndex + 1 }} – {{ endIndex }} из {{ totalItemsCount }}
        </template>
      </div>
      <nav class="data-table-pagination" aria-label="Навигация по страницам">
        <ul class="pagination pagination-sm mb-0">
          <template v-if="useFullPagination">
            <li class="page-item" :class="{ disabled: isFirstDisabled }">
              <button type="button" class="page-link page-link--icon" aria-label="Первая страница" :disabled="isFirstDisabled" @click="firstPage">
                <LucideIcon name="ChevronsLeft" :size="16" />
              </button>
            </li>
          </template>
          <li class="page-item" :class="{ disabled: isPrevDisabled }">
            <button type="button" class="page-link page-link--icon" aria-label="Предыдущая страница" :disabled="isPrevDisabled" @click="prevPage">
              <LucideIcon name="ChevronLeft" :size="16" />
            </button>
          </li>
          <template v-if="useFullPagination">
            <li v-for="(page, idx) in visiblePages" :key="idx" class="page-item" :class="{ active: page === currentPage, disabled: page === '...' }">
              <button v-if="page !== '...'" type="button" class="page-link page-link--number" @click="goToPage(page)">
                {{ page }}
              </button>
              <span v-else class="page-link page-link--ellipsis">…</span>
            </li>
          </template>
          <li v-else-if="useSimpleServerPagination" class="page-item active" aria-current="page">
            <span class="page-link page-link--number">{{ currentPage }}</span>
          </li>
          <li class="page-item" :class="{ disabled: isNextDisabled }">
            <button type="button" class="page-link page-link--icon" aria-label="Следующая страница" :disabled="isNextDisabled" @click="nextPage">
              <LucideIcon name="ChevronRight" :size="16" />
            </button>
          </li>
          <template v-if="useFullPagination">
            <li class="page-item" :class="{ disabled: isLastDisabled }">
              <button type="button" class="page-link page-link--icon" aria-label="Последняя страница" :disabled="isLastDisabled" @click="lastPage">
                <LucideIcon name="ChevronsRight" :size="16" />
              </button>
            </li>
          </template>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LucideIcon from '@/components/LucideIcon.vue'

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
  },
  /** Серверная пагинация: has_next / has_previous; при totalItems — полный блок страниц */
  hasNextPage: {
    type: Boolean,
    default: null,
  },
  hasPreviousPage: {
    type: Boolean,
    default: null,
  },
  emptyText: {
    type: String,
    default: 'Нет данных',
  },
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
const useServerPagination = computed(
  () => props.hasNextPage !== null && props.hasPreviousPage !== null,
)

const hasKnownTotal = computed(
  () => props.totalItems !== null && props.totalItems >= 0,
)

const useSimpleServerPagination = computed(
  () => useServerPagination.value && !hasKnownTotal.value,
)

const totalItemsCount = computed(() => {
  if (props.totalItems !== null) {
    return props.totalItems
  }
  return props.items.length
})

const totalColumnCount = computed(() => {
  return props.columns.length + (props.showNumberColumn ? 1 : 0)
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalItemsCount.value / props.itemsPerPage) || 1)
})

const useFullPagination = computed(() => {
  if (!props.enablePagination) {
    return false
  }
  if (useServerPagination.value) {
    return hasKnownTotal.value && totalPages.value > 1
  }
  return totalPages.value > 1
})

const showPaginationControls = computed(() => {
  if (useFullPagination.value) {
    return true
  }
  if (useSimpleServerPagination.value) {
    return props.hasNextPage || props.hasPreviousPage || props.currentPage > 1
  }
  return totalItemsCount.value > props.itemsPerPage
})

const isFirstDisabled = computed(() => props.currentPage <= 1)

const isLastDisabled = computed(() => props.currentPage >= totalPages.value)

const isPrevDisabled = computed(() => {
  if (useSimpleServerPagination.value) {
    return !props.hasPreviousPage
  }
  return props.currentPage <= 1
})

const isNextDisabled = computed(() => {
  if (useSimpleServerPagination.value) {
    return !props.hasNextPage
  }
  return props.currentPage >= totalPages.value
})

const displayItems = computed(() => {
  if (!props.enablePagination) {
    return props.items
  }
  if (props.totalItems !== null || useServerPagination.value) {
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
  const target = Number(page)
  if (!Number.isFinite(target) || target < 1 || target > totalPages.value || target === props.currentPage) {
    return
  }
  emit('update:currentPage', target)
  emit('pageChange', target)
}

const firstPage = () => {
  goToPage(1)
}

const lastPage = () => {
  goToPage(totalPages.value)
}

const prevPage = () => {
  if (!isPrevDisabled.value) {
    const newPage = props.currentPage - 1
    emit('update:currentPage', newPage)
    emit('pageChange', newPage)
  }
}

const nextPage = () => {
  if (!isNextDisabled.value) {
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

.data-table-empty-cell {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--color-secondary-text);
}

@media (max-width: 768px) {
  .table-responsive {
    font-size: 0.875rem;
  }
}

.data-table-pagination {
  flex-shrink: 0;
}

.data-table-pagination .pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.data-table-pagination .page-item {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;

  &::marker {
    content: none;
  }
}

.data-table-pagination .page-link {
  position: static;
  float: none;
  margin-left: 0 !important;
  border-radius: 0.375rem;
  padding: 0;
  color: var(--color-primary-text);
  background-color: var(--color-primary-background);
  border: 1px solid var(--color-border);
  min-width: 2.25rem;
  width: 2.25rem;
  height: 2.25rem;
  line-height: 1;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: none !important;
}

.data-table-pagination .page-link--number {
  min-width: 2.25rem;
  width: auto;
  padding: 0 0.5rem;
}

.data-table-pagination .page-link--ellipsis {
  border-color: transparent;
  background-color: transparent;
  cursor: default;
  min-width: 1.5rem;
  width: auto;
  padding: 0 0.125rem;
}

.data-table-pagination button.page-link {
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.data-table-pagination .page-item.active .page-link {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-primary-background);
  font-weight: 600;
}

.data-table-pagination .page-item.disabled .page-link {
  color: var(--color-secondary-text);
  opacity: 0.5;
  pointer-events: none;
}

.data-table-pagination .page-item:not(.disabled):not(.active) button.page-link:hover {
  background-color: var(--color-hover-background);
  border-color: var(--color-border);
  color: var(--color-primary-text);
}

.data-table-page-label {
  margin-left: 0.25rem;
}
</style>
