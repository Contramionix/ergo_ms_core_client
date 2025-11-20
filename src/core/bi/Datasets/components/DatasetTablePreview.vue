<template>
  <div class="preview-main">
    <div class="toolbar">
      <div class="title-label">Предпросмотр</div>
      <div class="search-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          class="form-control form-control-sm search-input" 
          placeholder="Поиск по таблице..."
          @input="handleSearchInput"
        />
      </div>
      <div class="title-input">
        <div class="input-label-left">Загружено строк:</div>
        <div class="input-value">{{ loadedRowsCount }}</div>
      </div>
      <div class="limit-input-container">
        <label class="limit-label">Лимит строк:</label>
        <input 
          type="number" 
          v-model.number="localLimit" 
          class="form-control form-control-sm limit-input" 
          min="1"
          max="10000"
          @input="handleLimitInput"
          @change="handleLimitChange"
          @blur="handleLimitBlur"
        />
      </div>
    </div>
    
    <div v-if="errorState" class="error-message">
      <h2>Ошибка</h2>
      <p>{{ errorState }}</p>
    </div>
    
    <!-- Таблица предпросмотра -->
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
          <template v-if="isLoading && allRows.length === 0">
            <tr>
              <td :colspan="datatableColumns.length" class="loading-cell">
                <div class="spinner-border spinner-border-sm" role="status">
                  <span class="visually-hidden">Загрузка...</span>
                </div>
              </td>
            </tr>
          </template>
          <template v-else-if="!isLoading && visibleRows.length === 0 && allRows.length === 0">
            <tr>
              <td :colspan="datatableColumns.length" class="no-data-cell">
                {{ searchQuery ? 'Ничего не найдено' : 'Нет данных' }}
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="(row, rowIndex) in visibleRows" :key="rowIndex">
              <td v-for="(col, colIndex) in datatableColumns" :key="colIndex">
                {{ getCellValue(row, col.field) }}
              </td>
            </tr>
            <tr v-if="isLoadingMore">
              <td :colspan="datatableColumns.length" class="loading-more-cell">
                <div class="loading-more">
                  <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                  </div>
                  <span>Загрузка следующих строк...</span>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-vue-next'
import datasetService from '@/core/bi/MainPage/Sidebar/components/js/datasetService.js'

const props = defineProps({
  cols: Array,
  rows: Array,
  limit: Number,
  fields: Array,
  isPreviewVisible: Boolean,
  datasetId: Number
})

const emit = defineEmits(['update:limit', 'switch-to-sources'])

// Локальное значение лимита, синхронизируется с props.limit
const localLimit = ref(props.limit || parseInt(import.meta.env.VITE_BI_PREVIEW_ROWS_LIMIT || '200', 10))

// Синхронизируем localLimit с props.limit
watch(() => props.limit, (newLimit) => {
  if (newLimit !== undefined && newLimit !== null) {
    localLimit.value = newLimit
  }
}, { immediate: true })

// Состояние
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const allRows = ref([])
const allColumns = ref([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const currentOffset = ref(0)
const searchDebounceTimer = ref(null)
const errorState = ref(null)
const PAGE_SIZE = 1000

// Обработка изменения лимита
function handleLimitInput() {
  // Валидация при вводе
  if (localLimit.value === null || localLimit.value === undefined || isNaN(localLimit.value)) {
    return // Пропускаем невалидные значения при вводе
  }
  
  // Ограничиваем значение
  if (localLimit.value < 1) {
    localLimit.value = 1
  } else if (localLimit.value > 10000) {
    localLimit.value = 10000
  }
  
  // Эмитим событие для обновления в родительском компоненте
  emit('update:limit', localLimit.value)
}

function handleLimitChange() {
  // Валидация значения при изменении
  if (localLimit.value === null || localLimit.value === undefined || isNaN(localLimit.value)) {
    // Если значение невалидно, возвращаем к значению по умолчанию
    localLimit.value = props.limit || parseInt(import.meta.env.VITE_BI_PREVIEW_ROWS_LIMIT || '200', 10)
  }
  
  if (localLimit.value < 1) {
    localLimit.value = 1
  } else if (localLimit.value > 10000) {
    localLimit.value = 10000
  }
  
  // Эмитим событие для обновления в родительском компоненте
  emit('update:limit', localLimit.value)
}

function handleLimitBlur() {
  // При потере фокуса также валидируем и обновляем
  handleLimitChange()
}

// Инициализация
onMounted(async () => {
  // Если есть данные в props (черновик), используем их и не загружаем через API
  if (props.rows && props.rows.length > 0 && props.cols && props.cols.length > 0) {
    allRows.value = props.rows
    allColumns.value = props.cols
    return
  }
  
  // Загружаем через API только если есть datasetId и нет данных в props
  if (props.datasetId && props.isPreviewVisible) {
    await loadInitialData()
  }
  
  // Обработка скролла до конца (для автоматической загрузки следующих страниц)
  await nextTick()
  const tableWrapper = document.querySelector('.table-wrapper')
  if (tableWrapper) {
    tableWrapper.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = tableWrapper
      // Загружаем следующую страницу, когда пользователь доскроллил до 80% от конца
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        if (hasMore.value && !isLoadingMore.value) {
          loadMore()
        }
      }
    })
  }
})

// Отслеживаем изменения datasetId и isPreviewVisible
watch(() => [props.datasetId, props.isPreviewVisible], async ([datasetId, isVisible]) => {
  // Если есть данные в props (черновик), используем их
  if (props.rows && props.rows.length > 0 && props.cols && props.cols.length > 0) {
    allRows.value = props.rows
    allColumns.value = props.cols
    return
  }
  
  if (datasetId && isVisible) {
    // Сбрасываем состояние при смене датасета
    allRows.value = []
    allColumns.value = []
    currentOffset.value = 0
    hasMore.value = true
    searchQuery.value = ''
    debouncedSearchQuery.value = ''
    await loadInitialData()
  }
}, { immediate: false })

// Если данные переданы через props (черновик), используем их
watch(() => [props.rows, props.cols], ([rows, cols]) => {
  // Если данные переданы через props (черновик), всегда используем их
  if (rows && Array.isArray(rows) && cols && Array.isArray(cols) && cols.length > 0) {
    // Для черновика всегда обновляем данные из props
    // Создаем новые массивы для гарантии реактивности
    allRows.value = Array.isArray(rows) ? [...rows] : rows
    allColumns.value = Array.isArray(cols) ? [...cols] : cols
    // Сбрасываем состояние пагинации при обновлении данных
    currentOffset.value = 0
    hasMore.value = false // Для черновика не загружаем больше через API
  } else if (rows && Array.isArray(rows) && rows.length === 0) {
    // Если данные пустые, очищаем
    allRows.value = []
    allColumns.value = cols || []
  }
}, { immediate: true, deep: true })

// Дополнительный watch для отслеживания изменений длины массива (для надежности)
watch(() => props.rows?.length, (newLength) => {
  if (props.rows && Array.isArray(props.rows) && props.cols && Array.isArray(props.cols) && props.cols.length > 0) {
    // Если длина изменилась, обновляем данные
    if (newLength !== allRows.value.length) {
      allRows.value = [...props.rows]
      allColumns.value = [...props.cols]
      currentOffset.value = 0
      hasMore.value = false
    }
  }
})

// Загрузка начальных данных
async function loadInitialData() {
  // Если есть данные в props (черновик), используем их вместо загрузки через API
  if (props.rows && props.rows.length > 0 && props.cols && props.cols.length > 0) {
    allRows.value = props.rows
    allColumns.value = props.cols
    return
  }
  
  if (!props.datasetId) {
    // Если datasetId не указан, используем данные из props (обратная совместимость)
    if (props.rows && props.rows.length > 0) {
      allRows.value = props.rows
      allColumns.value = props.cols || []
    }
    return
  }
  
  isLoading.value = true
  currentOffset.value = 0
  allRows.value = []
  hasMore.value = true
  
  try {
    errorState.value = null
    const response = await datasetService.preview(props.datasetId, {
      limit: PAGE_SIZE,
      offset: 0,
      search: debouncedSearchQuery.value || undefined
    })
    
    if (response.success && response.data) {
      allColumns.value = response.data.columns || props.cols || []
      allRows.value = response.data.rows || []
      hasMore.value = response.data.has_more || false
    } else {
      errorState.value = response.message || 'Ошибка загрузки данных'
    }
  } catch (error) {
    console.error('Ошибка загрузки данных:', error)
    errorState.value = error.message || 'Ошибка загрузки данных'
  } finally {
    isLoading.value = false
  }
}

// Загрузка следующих страниц
async function loadMore() {
  // Для черновика (когда есть данные в props) не загружаем через API
  if (props.rows && props.rows.length > 0 && props.cols && props.cols.length > 0) {
    return
  }
  
  if (isLoadingMore.value || !hasMore.value || !props.datasetId) return
  
  isLoadingMore.value = true
  
  try {
    const nextOffset = currentOffset.value + PAGE_SIZE
    const response = await datasetService.preview(props.datasetId, {
      limit: PAGE_SIZE,
      offset: nextOffset,
      search: debouncedSearchQuery.value || undefined
    })
    
    if (response.success && response.data) {
      allRows.value = [...allRows.value, ...(response.data.rows || [])]
      hasMore.value = response.data.has_more || false
      currentOffset.value = nextOffset
    } else {
      errorState.value = response.message || 'Ошибка загрузки дополнительных данных'
    }
  } catch (error) {
    console.error('Ошибка загрузки дополнительных данных:', error)
    errorState.value = error.message || 'Ошибка загрузки дополнительных данных'
  } finally {
    isLoadingMore.value = false
  }
}


// Обработка поиска с debounce
function handleSearchInput() {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
  
  searchDebounceTimer.value = setTimeout(async () => {
    debouncedSearchQuery.value = searchQuery.value
    await loadInitialData()
  }, 500) // 500ms debounce
}

// Очистка таймера
onUnmounted(() => {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
})

const nameMap = computed(() =>
  Object.fromEntries((props.fields || []).map(f => [f.source_column, f.name]))
)

const datatableColumns = computed(() => {
  const cols = allColumns.value.length > 0 ? allColumns.value : (props.cols || [])
  return cols.map(col => ({
    title: nameMap.value[col] || col,
    field: toField(nameMap.value[col] || col),
    sortable: true,
  }))
})

const tableRows = computed(() => {
  if (!allRows.value || allRows.value.length === 0) {
    return []
  }
  
  const fields = (allColumns.value.length > 0 ? allColumns.value : (props.cols || [])).map(toField)
  
  return allRows.value.map(rowArr => {
    // Преобразуем массив значений строки в объект с полями
    const rowObj = {}
    fields.forEach((field, idx) => {
      rowObj[field] = rowArr && Array.isArray(rowArr) ? rowArr[idx] : (rowArr[field] || rowArr[idx] || '')
    })
    return rowObj
  })
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

const visibleRows = computed(() => {
  let rows = sortedRows.value
  
  // Применяем фильтр поиска, если есть
  if (debouncedSearchQuery.value) {
    const query = debouncedSearchQuery.value.toLowerCase()
    rows = rows.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(query)
      )
    })
  }
  
  // Отладочная информация
  if (rows.length > 0 && process.env.NODE_ENV === 'development') {
    console.log('[DatasetTablePreview] visibleRows:', rows.length, 'rows, first row:', rows[0])
  }
  
  return rows
})

const loadedRowsCount = computed(() => allRows.value.length)

function handleSort(col) {
  if (!col.sortable) return
  
  const column = col.field
  if (sortState.value.column === column) {
    // Переключаем направление сортировки
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

function toField(str) {
  const map = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l',
    'м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh',
    'щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  }
  return str.toLowerCase()
    .replace(/[а-яё]/g, x => map[x] ?? '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
</script>

<style scoped lang="scss">
.preview-main {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
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

.title-input {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.input-label-left {
  font-weight: 600;
}

.input-value {
  font-weight: bold;
}

.limit-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.limit-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-primary-text);
}

.limit-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.85rem;
  text-align: center;
  background-color: var(--color-primary-background);
  color: var(--color-primary-text);
}

.limit-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(229, 57, 53, 0.1);
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

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 0.875rem;
}

// Адаптивность для мобильных устройств
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-container {
    max-width: 100%;
  }
  
  .title-input {
    justify-content: flex-start;
  }
  
  .limit-input-container {
    justify-content: flex-start;
    width: 100%;
  }
  
  .limit-input {
    flex: 1;
    max-width: 120px;
  }
}
</style>
