<script setup>
import { ref, computed, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { makeSortComparator } from '@/core/bi/js/sortComparator.js'
import { getColorForValue } from './ChartSectionSettings/tableColorPresets.js'

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

const sectionColumns = computed(() => props.displayOptions?.sectionColumns ?? {})
const sectionColors = computed(() => props.displayOptions?.sectionColors ?? {})

const colorField = computed(() => {
  const arr = props.fields?.color
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null
})

const colorColumnIndex = computed(() => {
  const cf = colorField.value
  if (!cf) return -1
  const key = cf.id ?? cf.name
  const idx = columns.value.findIndex((c) => (c.id ?? c.name) === key)
  return idx >= 0 ? idx : -1
})

const pinnedCount = computed(() => {
  const n = Math.max(0, Math.floor(Number(sectionColumns.value.pinnedCount)) || 0)
  return Math.min(n, columns.value.length)
})

const STICKY_FALLBACK_PX = 100

function colKey(col) {
  return col.id ?? col.name
}

function getColumnWidth(col) {
  const key = colKey(col)
  const w = sectionColumns.value.widths?.[key]
  if (!w || w.mode === 'auto') return null
  if (w.mode === 'percent' && w.value != null) return `${w.value}%`
  if (w.mode === 'px' && w.value != null) return `${w.value}px`
  return null
}

function getStickyLeft(colIndex) {
  if (colIndex <= 0 || sectionColumns.value.widths == null) return 0
  let left = 0
  for (let i = 0; i < colIndex && i < columns.value.length; i++) {
    const col = columns.value[i]
    const key = colKey(col)
    const w = sectionColumns.value.widths?.[key]
    if (w?.mode === 'px' && w.value != null) left += w.value
    else left += STICKY_FALLBACK_PX
  }
  return left
}

function getCellStyle(col, colIndex, isHeader, isFooter, row, totalsRowData) {
  const style = {}
  const width = getColumnWidth(col)
  if (width) style.width = width
  const bgColor = !isHeader ? getCellBackgroundColor(col, colIndex, row, isFooter, totalsRowData) : null
  if (bgColor) style.backgroundColor = bgColor
  if (colIndex < pinnedCount.value) {
    style.position = 'sticky'
    style.left = `${getStickyLeft(colIndex)}px`
    style.zIndex = isHeader ? 2 : isFooter ? 2 : 1
    if (!bgColor) style.background = isHeader || isFooter ? 'var(--color-primary-background, #fff)' : 'inherit'
    style.boxShadow = colIndex < pinnedCount.value - 1 ? '2px 0 4px -2px rgba(0,0,0,0.1)' : 'none'
  }
  return style
}

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

  let result = Array.from(bucket.values())
  const sortSpec = props.fields?.sort?.[0]
  const fieldName = sortSpec ? (sortSpec.field ?? sortSpec.name) : null
  if (fieldName != null) {
    result = result.slice().sort(makeSortComparator(fieldName, sortSpec.desc === true))
  }
  return result
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

const colorColumnMinMax = computed(() => {
  const cf = colorField.value
  if (!cf || colorColumnIndex.value < 0) return { min: 0, max: 1 }
  const name = cf.name
  const values = aggregatedRows.value.map((r) => Number(r[name])).filter(Number.isFinite)
  if (!values.length) return { min: 0, max: 1 }
  return { min: Math.min(...values), max: Math.max(...values) }
})

function getCellBackgroundColor(col, colIndex, row, isFooter, totalsRowData) {
  const cf = colorField.value
  if (!cf || colorColumnIndex.value < 0) return null
  const opts = sectionColors.value
  if (!opts?.gradientPreset) return null
  const value = isFooter && totalsRowData ? totalsRowData[cf.name] : row?.[cf.name]
  const { min, max } = colorColumnMinMax.value
  return getColorForValue(value, opts, min, max)
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
            <th v-for="(col, colIndex) in columns" :key="col.id ?? col.name" scope="col" class="chart-table-cell" :style="getCellStyle(col, colIndex, true, false, null, null)">{{ col.label ?? col.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in paginatedRows" :key="idx">
            <td v-for="(col, colIndex) in columns" :key="col.id ?? col.name" class="chart-table-cell" :class="{ 'chart-table-cell--preserve': preserveSpaces }" :style="getCellStyle(col, colIndex, false, false, row, null)">
              {{ formatCellValue(col, row[col.name]) }}
            </td>
          </tr>
        </tbody>
        <tfoot v-if="showTotals && totalsRow" class="chart-table-tfoot">
          <tr>
            <td v-for="(col, colIndex) in columns" :key="col.id ?? col.name" class="chart-table-cell chart-table-cell--preserve" :style="getCellStyle(col, colIndex, false, true, null, totalsRow)">
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
  width: 100%;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
}
.chart-table-scroll {
  flex: 1;
  min-width: 0;
  width: 100%;
  overflow: auto;
}
.chart-table {
  table-layout: fixed;
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
