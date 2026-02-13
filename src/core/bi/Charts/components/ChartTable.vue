<script setup>
import { ref, computed, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  fields: { type: Object, default: () => ({}) },
  settings: { type: Array, default: () => [] },
  dataset: { type: Array, default: () => [] },
  displayOptions: { type: Object, default: () => ({}) },
})

const pageSize = computed(() => Math.max(1, Number(props.displayOptions?.limit) || 20))
const currentPage = ref(1)

const NUMERIC_TYPES = ['integer', 'float']

function isNumericColumn(col) {
  const t = col?.type ?? ''
  return NUMERIC_TYPES.includes(t)
}

const columns = computed(() => {
  const cols = props.fields?.columns
  return Array.isArray(cols) ? cols : []
})

const categoryColumns = computed(() =>
  columns.value.filter(col => !isNumericColumn(col))
)
const numericColumns = computed(() =>
  columns.value.filter(col => isNumericColumn(col))
)

const useGrouping = computed(() => props.displayOptions?.grouping !== false)

const aggregatedRows = computed(() => {
  const rows = props.dataset ?? []
  const cats = categoryColumns.value
  const nums = numericColumns.value
  if (!rows.length || !columns.value.length) return []
  if (!useGrouping.value) return rows

  const makeKey = row => cats.map(c => row[c.name] ?? '').join('\0')
  const bucket = new Map()

  for (const row of rows) {
    const key = makeKey(row)
    if (!bucket.has(key)) {
      bucket.set(key, { ...Object.fromEntries(cats.map(c => [c.name, row[c.name]])), ...Object.fromEntries(nums.map(c => [c.name, 0])) })
    }
    const agg = bucket.get(key)
    for (const n of nums) {
      agg[n.name] = (agg[n.name] ?? 0) + (Number(row[n.name]) || 0)
    }
  }

  return Array.from(bucket.values())
})

const totalRows = computed(() => aggregatedRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)))

watch(aggregatedRows, () => {
  if (currentPage.value > totalPages.value && totalPages.value > 0) currentPage.value = 1
}, { immediate: true })

const paginatedRows = computed(() => {
  const data = aggregatedRows.value
  const size = pageSize.value
  const start = (currentPage.value - 1) * size
  return data.slice(start, start + size)
})

const pageStart = computed(() => (currentPage.value - 1) * pageSize.value + 1)
const pageEnd = computed(() => Math.min(currentPage.value * pageSize.value, totalRows.value))

const showPagination = computed(() => props.displayOptions?.pagination !== false && totalRows.value > pageSize.value)

const tableSizeClass = computed(() => {
  const s = (props.displayOptions?.tableSize || 'm').toLowerCase()
  return `chart-table--size-${s === 's' || s === 'l' ? s : 'm'}`
})

const showTotals = computed(() => props.displayOptions?.tableShowTotals === true)

const preserveSpaces = computed(() => props.displayOptions?.preserveSpaces === true)

const totalsRow = computed(() => {
  if (!showTotals.value || !numericColumns.value.length) return null
  const row = {}
  for (const col of columns.value) {
    if (isNumericColumn(col)) {
      const values = aggregatedRows.value.map(r => Number(r[col.name])).filter(Number.isFinite)
      row[col.name] = values.length ? values.reduce((a, b) => a + b, 0) : null
    } else {
      row[col.name] = null
    }
  }
  return row
})

function columnMax(col) {
  const name = col?.name
  const data = aggregatedRows.value
  if (!name || !data?.length) return 0
  const values = data.map(r => Number(r[name])).filter(Number.isFinite)
  return values.length ? Math.max(...values) : 0
}

function barWidth(col, value) {
  const max = columnMax(col)
  if (!max || value == null) return 0
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return 0
  return Math.min(100, (num / max) * 100)
}

function formatCellValue(col, value) {
  if (value == null || value === '') return '—'
  if (isNumericColumn(col)) {
    const num = Number(value)
    return Number.isFinite(num) ? (Number.isInteger(num) ? num : num.toFixed(2)) : String(value)
  }
  return String(value)
}

function goPrev() {
  if (currentPage.value > 1) currentPage.value--
}

function goNext() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>

<template>
  <div class="chart-table-wrapper" :class="tableSizeClass">
    <div class="chart-table-scroll">
      <table class="chart-table table table-striped table-hover">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.id ?? col.name" scope="col">{{ col.label ?? col.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in paginatedRows" :key="idx">
            <td v-for="col in columns" :key="col.id ?? col.name" class="chart-table-cell" :class="{ 'chart-table-cell--preserve': preserveSpaces }">
              <template v-if="isNumericColumn(col) && row[col.name] != null">
                <div class="chart-table-cell-bar-wrap">
                  <div
                    class="chart-table-cell-bar"
                    :style="{ width: barWidth(col, row[col.name]) + '%' }"
                  />
                  <span class="chart-table-cell-value">{{ formatCellValue(col, row[col.name]) }}</span>
                </div>
              </template>
              <template v-else>
                {{ formatCellValue(col, row[col.name]) }}
              </template>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="showTotals && totalsRow" class="chart-table-tfoot">
          <tr>
            <td v-for="col in columns" :key="col.id ?? col.name" class="chart-table-cell chart-table-cell--preserve">
              <template v-if="isNumericColumn(col) && totalsRow[col.name] != null">
                {{ formatCellValue(col, totalsRow[col.name]) }}
              </template>
              <template v-else>
                {{ col.name === columns[0]?.name ? 'Итого' : '' }}
              </template>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div v-if="showPagination" class="chart-table-pagination">
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="currentPage <= 1" @click="goPrev">
        <ChevronLeft :size="16" />
      </button>
      <span class="chart-table-pagination-page">{{ currentPage }}</span>
      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="currentPage >= totalPages" @click="goNext">
        <ChevronRight :size="16" />
      </button>
      <span class="chart-table-pagination-info">Строки: {{ pageStart }}-{{ pageEnd }}</span>
    </div>
  </div>
</template>

<style scoped>
.chart-table-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
}
.chart-table-scroll {
  flex: 1;
  overflow: auto;
}
.chart-table {
  width: 100%;
  margin-bottom: 0;
  font-size: 0.875rem;
}

.chart-table-wrapper.chart-table--size-s .chart-table {
  font-size: 0.75rem;
}

.chart-table-wrapper.chart-table--size-l .chart-table {
  font-size: 1rem;
}

.chart-table-cell--preserve {
  white-space: pre-wrap;
}

.chart-table-tfoot {
  font-weight: 600;
  border-top: 2px solid var(--color-border, #dee2e6);
}
.chart-table-cell-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.chart-table-cell-bar {
  flex-shrink: 0;
  height: 8px;
  min-width: 4px;
  background: var(--bs-primary, #0d6efd);
  border-radius: 4px;
}
.chart-table-cell-value {
  flex-shrink: 0;
}
.chart-table-pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-top: 1px solid var(--color-border, #dee2e6);
  flex-shrink: 0;
}
.chart-table-pagination-page {
  min-width: 1.5rem;
  text-align: center;
}
.chart-table-pagination-info {
  margin-left: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-secondary-text, #6c757d);
}
</style>
