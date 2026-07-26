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
    <Pagination
      v-if="enablePagination"
      :model-value="currentPage"
      :total-pages="totalPages"
      :total-items="paginationTotalItems"
      :page-size="itemsPerPage"
      :visible-count="displayItems.length"
      :variant="paginationVariant"
      layout="toolbar"
      :has-next-page="paginationHasNext"
      :has-previous-page="paginationHasPrevious"
      @update:model-value="handlePageChange"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Pagination from '@/components/Pagination.vue'

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

function handlePageChange(page) {
  emit('update:currentPage', page)
  emit('pageChange', page)
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

const paginationVariant = computed(() =>
  useSimpleServerPagination.value ? 'simple' : 'full',
)

const paginationTotalItems = computed(() =>
  useSimpleServerPagination.value ? null : totalItemsCount.value,
)

const paginationHasNext = computed(() =>
  useSimpleServerPagination.value ? props.hasNextPage : null,
)

const paginationHasPrevious = computed(() =>
  useSimpleServerPagination.value ? props.hasPreviousPage : null,
)

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
</style>
