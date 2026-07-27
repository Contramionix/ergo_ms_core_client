<template>
  <div class="data-table">
    <div v-if="useCards" class="data-table-cards">
      <div v-if="!displayItems.length" class="data-table-cards__empty">
        <slot name="empty">{{ resolvedEmptyText }}</slot>
      </div>
      <article
        v-for="(item, idx) in displayItems"
        v-else
        :key="getItemKey(item, idx)"
        class="data-table-card"
        :class="[getRowClass(item, idx), { 'data-table-card--clickable': clickable }]"
        @click="handleRowClick(item, idx)"
      >
        <div v-if="showNumberColumn" class="data-table-card__meta text-muted">
          № {{ displayNumberOffset + idx + 1 }}
        </div>
        <div
          v-for="column in cardBodyColumns"
          :key="column.key"
          class="data-table-card__row"
        >
          <div v-if="column.label" class="data-table-card__label">{{ column.label }}</div>
          <div class="data-table-card__value" :class="column.cellClass">
            <slot :name="`cell-${column.key}`" :item="item" :index="idx" :column="column">
              {{ getCellValue(item, column) }}
            </slot>
          </div>
        </div>
        <div v-if="actionsColumn" class="data-table-card__actions" @click.stop>
          <slot :name="`cell-${actionsColumn.key}`" :item="item" :index="idx" :column="actionsColumn">
            {{ getCellValue(item, actionsColumn) }}
          </slot>
        </div>
      </article>
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0" :class="tableClass">
        <thead class="data-table-header">
          <tr>
            <th v-if="showNumberColumn" style="width: 50px;">№</th>
            <th v-for="column in visibleColumns" :key="column.key" :class="column.headerClass" :style="column.headerStyle">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!displayItems.length" class="data-table-empty-row">
            <td :colspan="totalColumnCount" class="data-table-empty-cell">
              <slot name="empty">{{ resolvedEmptyText }}</slot>
            </td>
          </tr>
          <tr v-for="(item, idx) in displayItems" v-else :key="getItemKey(item, idx)" :class="getRowClass(item, idx)" @click="handleRowClick(item, idx)">
            <td v-if="showNumberColumn" class="text-muted">{{ displayNumberOffset + idx + 1 }}</td>
            <td v-for="column in visibleColumns" :key="column.key" :class="column.cellClass" :style="column.cellStyle">
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
import { BREAKPOINTS, useBreakpoint } from '@/composables/useBreakpoint.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

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
    default: undefined,
  },
  /**
   * Брейкпоинт, ниже которого таблица становится карточками.
   * 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'never'
   */
  cardsBelow: {
    type: String,
    default: 'sm',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'xxl', 'never', ''].includes(value),
  },
})

const emit = defineEmits(['rowClick', 'update:currentPage', 'pageChange'])

const resolvedEmptyText = computed(
  () => props.emptyText ?? t('components.dataTable.noData'),
)

const { width, isSmUp } = useBreakpoint()

function isColumnVisible(column) {
  if (column.hideOnCompact === true && width.value < BREAKPOINTS.md) {
    return false
  }
  const hideBelow = column.hideBelow
  if (!hideBelow) {
    return true
  }
  const minWidth = BREAKPOINTS[hideBelow]
  if (minWidth == null) {
    return true
  }
  return width.value >= minWidth
}

const visibleColumns = computed(() => props.columns.filter(isColumnVisible))

const useCards = computed(() => {
  if (!props.cardsBelow || props.cardsBelow === 'never') {
    return false
  }
  const minWidth = BREAKPOINTS[props.cardsBelow]
  if (minWidth == null) {
    return false
  }
  return width.value < minWidth
})

function isActionsColumn(column) {
  return column.key === 'actions' || column.cardRole === 'actions'
}

const actionsColumn = computed(() =>
  visibleColumns.value.find(isActionsColumn) || null,
)

const cardBodyColumns = computed(() =>
  visibleColumns.value.filter((column) => !isActionsColumn(column)),
)

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
  return visibleColumns.value.length + (props.showNumberColumn ? 1 : 0)
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalItemsCount.value / props.itemsPerPage) || 1)
})

const paginationVariant = computed(() => {
  if (useSimpleServerPagination.value) {
    return 'simple'
  }
  // На узком экране полный блок страниц слишком плотный
  if (!isSmUp.value) {
    return 'simple'
  }
  return 'full'
})

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

.data-table-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.data-table-cards__empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-secondary-text);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-primary-background);
}

.data-table-card {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-primary-background);

  &--clickable {
    cursor: pointer;

    &:hover {
      background: var(--color-hover-background);
    }
  }
}

.data-table-card__meta {
  font-size: 0.75rem;
}

.data-table-card__row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.data-table-card__label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-secondary-text);
}

.data-table-card__value {
  min-width: 0;
  font-size: 0.9375rem;
  color: var(--color-primary-text);
  word-break: break-word;
}

.data-table-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  padding-top: 0.35rem;
  border-top: 1px solid var(--color-border);

  :deep(.actions-cell) {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.35rem;
    width: 100%;
  }
}

@media (width < $ui-bp-md) {
  .table-responsive {
    font-size: 0.875rem;
  }
}
</style>
