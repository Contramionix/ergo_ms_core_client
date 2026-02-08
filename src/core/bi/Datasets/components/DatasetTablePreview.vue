<template>
  <div class="preview-main">
    <div class="toolbar">
      <div class="title-label">Предпросмотр</div>
      <div class="search-container">
        <input type="text" v-model="searchQuery" class="form-control form-control-sm search-input" placeholder="Поиск по таблице..." @input="handleSearchInput"/>
      </div>
    </div>
    
    <div v-if="errorState" class="error-message"><h2>Ошибка</h2><p>{{ errorState }}</p></div>
    
    <div class="table-wrapper" v-if="datatableColumns.length && !errorState">
      <table class="preview-table">
        <thead>
          <tr>
            <th v-for="(col, index) in datatableColumns" :key="index">
              <div class="col-header">
                <span>{{ col.title }}</span>
                <span v-if="col.sortable" class="sort-indicator" @click="handleSort(col)">
                  <ChevronUp v-if="sortState.column === col.field && sortState.direction === 'asc'" :size="14" />
                  <ChevronDown v-else-if="sortState.column === col.field && sortState.direction === 'desc'" :size="14" />
                  <ChevronsUpDown v-else :size="14" />
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-if="(isLoading || isCurrentPageLoading) && paginatedRows.length === 0">
            <tr>
              <td :colspan="datatableColumns.length" class="loading-cell">
                <SpinnerLoading loadingText="Загрузка..." />
              </td>
            </tr>
          </template>
          <template v-else-if="!isLoading && !isCurrentPageLoading && paginatedRows.length === 0 && (isDraftMode ? allRows.length === 0 : totalRowsCount === 0)">
            <tr>
              <td :colspan="datatableColumns.length" class="no-data-cell">{{ searchQuery ? 'Ничего не найдено' : 'Нет данных' }}</td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="(row, rowIndex) in paginatedRows" :key="rowIndex">
              <td v-for="(col, colIndex) in datatableColumns" :key="colIndex">
                {{ getCellValue(row, col.field) }}
              </td>
            </tr>
            <tr v-if="isLoadingMore && isCurrentPageLoading">
              <td :colspan="datatableColumns.length" class="loading-more-cell"><SpinnerLoading :loadingText="`Загрузка страницы ${currentPage}...`" /></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    
    <div v-if="totalPages > 1" class="pagination-container">
      <button class="pagination-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)"><ChevronLeft :size="16" /></button>
      <div class="pagination-pages">
        <button v-for="page in visiblePages" :key="page" class="pagination-page" :class="{ 'pagination-page--active': page === currentPage }" @click="goToPage(page)">{{ page }}</button>
      </div>
      <button class="pagination-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)"><ChevronRight :size="16" /></button>
      <div class="pagination-goto">
        <input type="number" class="pagination-input" v-model.number="pageInput" :min="1" :max="totalPages" :placeholder="String(currentPage)" @keydown.enter="goToInputPage"/>
        <span class="pagination-goto-label">/ {{ totalPages }}</span>
        <button class="pagination-goto-btn" @click="goToInputPage" :disabled="!pageInput || pageInput < 1 || pageInput > totalPages">Перейти</button>
      </div>
      <span class="pagination-info">
        {{ paginationStart }}-{{ paginationEnd }} из {{ isDraftMode ? filteredRows.length : totalRowsCount }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import datasetService from '@/core/bi/MainPage/Sidebar/components/js/datasetService.js'

const props = defineProps({
  cols: Array,
  rows: Array,
  fields: Array,
  isPreviewVisible: Boolean,
  datasetId: Number
})

defineEmits(['switch-to-sources'])

const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const allRows = ref([])
const allColumns = ref([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const searchDebounceTimer = ref(null)
const errorState = ref(null)
const isInitialized = ref(false)
const loadRequestInProgress = ref(false)

const ITEMS_PER_PAGE = parseInt(import.meta.env.VITE_BI_PREVIEW_ITEMS_PER_PAGE || '20', 10)
const currentPage = ref(1)
const pageInput = ref(null)
const totalRowsCount = ref(0)
const pagesCache = ref(new Map())
const loadingPages = ref(new Set())

function resetPreviewState() {
  allRows.value = []
  allColumns.value = []
  totalRowsCount.value = 0
  pagesCache.value.clear()
  currentPage.value = 1
  searchQuery.value = ''
  debouncedSearchQuery.value = ''
}

onMounted(async () => {
  if (isDraftMode.value) {
    allRows.value = props.rows
    allColumns.value = props.cols
    totalRowsCount.value = props.rows.length
    isInitialized.value = true
    return
  }
  
  if (props.datasetId && !isInitialized.value) {
    await loadInitialData()
    isInitialized.value = true
  }
})

watch(() => props.isPreviewVisible, async (isVisible, oldIsVisible) => {
  if (isVisible && !oldIsVisible && props.datasetId && !isInitialized.value) {
    await loadInitialData()
    isInitialized.value = true
  }
}, { immediate: false })

watch(() => [props.datasetId, props.isPreviewVisible], async ([datasetId, isVisible], [oldDatasetId, oldIsVisible]) => {
  if (datasetId === oldDatasetId && isVisible === oldIsVisible && isInitialized.value) {
    return
  }

  if (datasetId && !loadRequestInProgress.value) {
    resetPreviewState()
    hasMore.value = true
    if (isVisible || !isInitialized.value) {
      await loadInitialData()
      isInitialized.value = true
    }
    return
  }
  
}, { immediate: false, flush: 'post' })

watch(() => props.cols, async (newCols, oldCols) => {
  if (props.datasetId && isInitialized.value && newCols && Array.isArray(newCols) && oldCols && Array.isArray(oldCols)) {
    const colsChanged = JSON.stringify(newCols) !== JSON.stringify(oldCols)
    
    if (colsChanged && !loadRequestInProgress.value) {
      resetPreviewState()
      if (props.isPreviewVisible) {
        await loadInitialData()
      }
    }
  }
}, { deep: true, flush: 'post' })

watch(() => [props.rows, props.cols], ([rows, cols], [oldRows, oldCols]) => {
  if (props.datasetId) {
    return
  }
  if (rows === oldRows && cols === oldCols && isInitialized.value) {
    return
  }
  if (rows && Array.isArray(rows) && cols && Array.isArray(cols) && cols.length > 0) {
    allRows.value = Array.isArray(rows) ? [...rows] : rows
    allColumns.value = Array.isArray(cols) ? [...cols] : cols
    totalRowsCount.value = rows.length
    pagesCache.value.clear()
    currentPage.value = 1
    isInitialized.value = true
  } else if (rows && Array.isArray(rows) && rows.length === 0) {
    allRows.value = []
    allColumns.value = cols || []
    totalRowsCount.value = 0
    pagesCache.value.clear()
  }
}, { immediate: false, deep: true, flush: 'post' })

watch(() => props.rows?.length, (newLength, oldLength) => {
  if (props.datasetId) {
    return
  }
  if (newLength === oldLength && isInitialized.value) {
    return
  }
  if (props.rows && Array.isArray(props.rows) && props.cols && Array.isArray(props.cols) && props.cols.length > 0) {
    if (newLength !== allRows.value.length) {
      allRows.value = [...props.rows]
      allColumns.value = [...props.cols]
      totalRowsCount.value = newLength
      pagesCache.value.clear()
      currentPage.value = 1
    }
  }
}, { immediate: false })

async function loadPage(page) {
  if (isDraftMode.value || !props.datasetId) return
  
  if (debouncedSearchQuery.value && allRows.value.length > 0) {
    return
  }
  
  if (pagesCache.value.has(page)) {
    return
  }
  
  if (loadingPages.value.has(page)) {
    return
  }
  
  loadingPages.value.add(page)
  isLoadingMore.value = true
  
  try {
    const offset = (page - 1) * ITEMS_PER_PAGE
    const params = {
      offset: offset,
      search: debouncedSearchQuery.value || undefined
    }
    
    if (!debouncedSearchQuery.value) {
      params.limit = ITEMS_PER_PAGE
    }
    
    const response = await datasetService.preview(props.datasetId, params)
    
    if (response.success && response.data) {
      const rows = response.data.rows || []
      
      const columns = response.data.columns || props.cols || []
      if (columns.length > 0) {
        allColumns.value = columns
      } else if (props.cols && props.cols.length > 0) {
        allColumns.value = props.cols
      }
      
      if (debouncedSearchQuery.value) {
        allRows.value = rows.map(rowArr => rowArrayToObject(rowArr, resolvedFields.value))
        totalRowsCount.value = allRows.value.length
      } else {
        pagesCache.value.set(page, rows)
        
        if (response.data.total_count !== undefined) {
          totalRowsCount.value = response.data.total_count
        } else if (response.data.has_more !== undefined) {
          if (!response.data.has_more) {
            totalRowsCount.value = offset + rows.length
          } else {
            const minTotal = offset + rows.length + 1
            if (totalRowsCount.value < minTotal) {
              totalRowsCount.value = minTotal
            }
          }
        } else {
          const minTotal = offset + rows.length + 1
          if (totalRowsCount.value < minTotal) {
            totalRowsCount.value = minTotal
          }
        }
        
        hasMore.value = response.data.has_more !== false
      }
    } else {
      console.warn(`Ошибка загрузки страницы ${page}:`, response.message)
    }
  } catch (error) {
    console.error(`Ошибка загрузки страницы ${page}:`, error)
  } finally {
    isLoadingMore.value = false
    loadingPages.value.delete(page)
  }
}

async function loadInitialData() {
  if (loadRequestInProgress.value || isLoading.value) return

  if (!props.datasetId) {
    if (props.rows?.length && props.cols?.length) {
      allRows.value = props.rows
      allColumns.value = props.cols
      totalRowsCount.value = props.rows.length
    } else if (props.rows?.length) {
      allRows.value = props.rows
      allColumns.value = props.cols || []
      totalRowsCount.value = props.rows.length
    }
    return
  }

  loadRequestInProgress.value = true
  isLoading.value = true
  pagesCache.value.clear()
  totalRowsCount.value = 0
  if (props.cols && props.cols.length > 0) {
    allColumns.value = props.cols
  }

  try {
    errorState.value = null
    await loadPage(1)
    if (pagesCache.value.size === 0 && totalRowsCount.value === 0) {
      errorState.value = 'Нет данных для отображения'
    }
  } catch (error) {
    console.error('Ошибка загрузки данных:', error)
    if (totalRowsCount.value === 0) {
      errorState.value = error.message || 'Ошибка загрузки данных'
    }
  } finally {
    isLoading.value = false
    loadRequestInProgress.value = false
  }
}

function handleSearchInput() {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
  
  searchDebounceTimer.value = setTimeout(() => {
    debouncedSearchQuery.value = searchQuery.value
  }, 500)
}

onUnmounted(() => {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
})

const nameMap = computed(() =>
  Object.fromEntries((props.fields || []).map(f => [f.source_column, f.name]))
)

function toField(str) {
  const map = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l',
    'м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh',
    'щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  }
  return str.toLowerCase()
    .replace(/[а-яё]/g, x => map[x] ?? '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function rowArrayToObject(rowArr, fields) {
  const rowObj = {}
  fields.forEach((field, idx) => {
    rowObj[field] = rowArr && Array.isArray(rowArr) ? rowArr[idx] : (rowArr[field] || rowArr[idx] || '')
  })
  return rowObj
}

const resolvedColumns = computed(() =>
  allColumns.value.length > 0 ? allColumns.value : (props.cols || [])
)

const resolvedFields = computed(() =>
  resolvedColumns.value.map(col => toField(nameMap.value[col] || col))
)

const datatableColumns = computed(() => {
  return resolvedColumns.value.map(col => ({
    title: nameMap.value[col] || col,
    field: toField(nameMap.value[col] || col),
    sortable: true,
  }))
})

const tableRows = computed(() => {
  if (!allRows.value?.length) return []
  const fields = resolvedFields.value
  return allRows.value.map(rowArr => rowArrayToObject(rowArr, fields))
})

const sortState = ref({ column: null, direction: null })

const sortedRows = computed(() => {
  if (!sortState.value.column || !sortState.value.direction) {
    return tableRows.value
  }
  
  const column = sortState.value.column
  const direction = sortState.value.direction
  
  return [...tableRows.value].sort((a, b) => {
    const aVal = a[column]
    const bVal = b[column]
    
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    }
    
    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    
    if (direction === 'asc') {
      return aStr > bStr ? 1 : aStr < bStr ? -1 : 0
    } else {
      return aStr < bStr ? 1 : aStr > bStr ? -1 : 0
    }
  })
})

const isDraftMode = computed(() => {
  return !props.datasetId && props.rows && props.rows.length > 0 && props.cols && props.cols.length > 0
})

const filteredRows = computed(() => {
  if (!isDraftMode.value) return []
  let rows = sortedRows.value
  if (debouncedSearchQuery.value) {
    const query = debouncedSearchQuery.value.toLowerCase()
    rows = rows.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(query)
      )
    })
  }
  
  return rows
})

const totalPages = computed(() => {
  if (isDraftMode.value) {
    return Math.ceil(filteredRows.value.length / ITEMS_PER_PAGE)
  } else if (debouncedSearchQuery.value && allRows.value.length > 0) {
    return Math.ceil(allRows.value.length / ITEMS_PER_PAGE) || 1
  } else {
    return Math.ceil(totalRowsCount.value / ITEMS_PER_PAGE) || 1
  }
})

const paginatedRows = computed(() => {
  if (isDraftMode.value) {
    const start = (currentPage.value - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return filteredRows.value.slice(start, end)
  } else if (debouncedSearchQuery.value && allRows.value.length > 0) {
    const start = (currentPage.value - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return allRows.value.slice(start, end)
  } else {
    const cachedPage = pagesCache.value.get(currentPage.value)
    if (cachedPage) {
      return cachedPage.map(rowArr => rowArrayToObject(rowArr, resolvedFields.value))
    }
    return []
  }
})

const paginationStart = computed(() => {
  if (isDraftMode.value) {
    if (filteredRows.value.length === 0) return 0
    return (currentPage.value - 1) * ITEMS_PER_PAGE + 1
  } else {
    if (totalRowsCount.value === 0) return 0
    return (currentPage.value - 1) * ITEMS_PER_PAGE + 1
  }
})

const paginationEnd = computed(() => {
  if (isDraftMode.value) {
    return Math.min(currentPage.value * ITEMS_PER_PAGE, filteredRows.value.length)
  } else {
    return Math.min(currentPage.value * ITEMS_PER_PAGE, totalRowsCount.value)
  }
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, 4, 5)
    } else if (current >= total - 2) {
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      for (let i = current - 2; i <= current + 2; i++) pages.push(i)
    }
  }
  
  return pages
})

watch([debouncedSearchQuery], async (newVal, oldVal) => {
  if (oldVal === undefined && !isInitialized.value) {
    return
  }
  if (!isDraftMode.value) {
    pagesCache.value.clear()
    totalRowsCount.value = 0
    currentPage.value = 1
    if (!newVal || !newVal[0]) {
      allRows.value = []
    }
    if (props.datasetId && isInitialized.value) {
      await loadPage(1)
    }
  } else {
    currentPage.value = 1
  }
}, { deep: true })

async function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    if (!isDraftMode.value && !debouncedSearchQuery.value) {
      if (!pagesCache.value.has(page)) {
        await loadPage(page)
      }
      const prevPage = page - 1
      const nextPage = page + 1
      if (prevPage >= 1 && !pagesCache.value.has(prevPage) && !loadingPages.value.has(prevPage)) {
        loadPage(prevPage)
      }
      if (nextPage <= totalPages.value && !pagesCache.value.has(nextPage) && !loadingPages.value.has(nextPage)) {
        loadPage(nextPage)
      }
    }
  }
}

async function goToInputPage() {
  if (pageInput.value && pageInput.value >= 1 && pageInput.value <= totalPages.value) {
    const page = pageInput.value
    currentPage.value = page
    pageInput.value = null
    if (!isDraftMode.value && !pagesCache.value.has(page)) {
      await loadPage(page)
    }
  }
}

const isCurrentPageLoading = computed(() => {
  return loadingPages.value.has(currentPage.value)
})

function handleSort(col) {
  if (!col.sortable) return
  
  const column = col.field
  if (sortState.value.column === column) {
    if (sortState.value.direction === 'asc') {
      sortState.value = { column, direction: 'desc' }
    } else {
      sortState.value = { column: null, direction: null }
    }
  } else {
    sortState.value = { column, direction: 'asc' }
  }
}

function getCellValue(row, field) {
  return row[field] ?? ''
}
</script>

<style scoped lang="scss">
.preview-main {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--color-primary-text);
  font-size: 0.9rem;
  min-height: 0;
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex: 0 0 auto;
}

.title-label {
  font-weight: bold;
  font-size: 1rem;
  margin-right: 1rem;
}

.search-container {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.error-message {
  text-align: center;
  padding: 2rem;
  border: 1px solid var(--color-accent);
  background: var(--color-primary-background);
  color: var(--color-accent);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.table-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-primary-background);
  -webkit-overflow-scrolling: touch;
}

.table-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-hover-background);
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  position: relative;
  table-layout: auto;
}

.preview-table tbody {
  display: table-row-group;
}

.preview-table tbody tr {
  height: auto;
}

.preview-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-primary-background);
}

.preview-table th {
  min-width: 120px;
  max-width: 300px;
  position: sticky;
  top: 0;
  background-color: var(--color-primary-background);
  z-index: 5;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  text-align: left;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-table td {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  background-color: var(--color-primary-background);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.preview-table tbody tr:hover td {
  background-color: var(--color-hover-background);
}

.col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

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

.loading-cell,
.no-data-cell {
  text-align: center;
  padding: 2rem !important;
  color: var(--color-secondary-text, #6c757d);
}

.loading-more-cell {
  text-align: center;
  padding: 1rem !important;
}

.pagination-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  margin-top: 12px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.pagination-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-primary-text);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--color-hover-background);
    border-color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.pagination-pages {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-page {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--color-secondary-text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(.pagination-page--active) {
    background: var(--color-hover-background);
    color: var(--color-primary-text);
  }

  &--active {
    background: var(--color-accent);
    color: var(--color-primary-background);
    font-weight: 600;
    cursor: default;
  }
}

.pagination-goto {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid var(--color-border);
}

.pagination-input {
  width: 60px;
  height: 28px;
  padding: 0 8px;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-primary-text);
  font-size: 13px;
  text-align: center;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(229, 57, 53, 0.15);
  }

  &::placeholder {
    color: var(--color-secondary-text);
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  appearance: textfield;
  -moz-appearance: textfield;
}

.pagination-goto-label {
  font-size: 13px;
  color: var(--color-secondary-text);
}

.pagination-goto-btn {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--color-hover-background);
    border-color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.pagination-info {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-secondary-text);
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-container {
    max-width: 100%;
  }
  
  .pagination-container {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .pagination-info {
    width: 100%;
    text-align: center;
    margin-top: 8px;
  }
}
</style>