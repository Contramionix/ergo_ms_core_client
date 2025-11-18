<template>
  <div class="preview-main">
    <div class="main-title">
      <div class="title-label" style="font-weight: bold; margin-right:2rem">Предпросмотр</div>
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
    </div>
    
    <!-- Таблица предпросмотра -->
    <div class="main-grid" style="position: relative;">
      <VirtualizedTable
        v-if="datatableColumns.length > 0 && visibleRows.length > 0"
        :columns="datatableColumns"
        :rows="visibleRows"
        :loading="isLoading"
        :row-height="40"
        :overscan="10"
        @sort="handleSort"
        @scroll-end="handleScrollEnd"
      />
      <div v-else-if="isLoading && visibleRows.length === 0" class="loading-placeholder">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
      </div>
      <div v-else-if="!isLoading && visibleRows.length === 0" class="no-data-placeholder">
        {{ searchQuery ? 'Ничего не найдено' : 'Нет данных' }}
      </div>
      <div v-if="isLoadingMore" class="loading-more">
        <div class="spinner-border spinner-border-sm" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
        <span>Загрузка следующих строк...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import VirtualizedTable from './VirtualizedTable.vue'
import datasetService from '@/core/bi/MainPage/Sidebar/components/js/datasetService.js'

const props = defineProps({
  cols: Array,
  rows: Array,
  limit: Number,
  fields: Array,
  isPreviewVisible: Boolean,
  datasetId: Number
})

defineEmits(['update:limit', 'switch-to-sources'])

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
const PAGE_SIZE = 1000

// Инициализация
onMounted(async () => {
  if (props.datasetId && props.isPreviewVisible) {
    await loadInitialData()
  }
})

// Отслеживаем изменения datasetId и isPreviewVisible
watch(() => [props.datasetId, props.isPreviewVisible], async ([datasetId, isVisible]) => {
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

// Если данные переданы через props (старый способ), используем их
watch(() => [props.rows, props.cols], ([rows, cols]) => {
  if (rows && rows.length > 0 && !props.datasetId) {
    // Используем данные из props, если datasetId не указан (обратная совместимость)
    allRows.value = rows
    allColumns.value = cols || []
  }
}, { immediate: true })

// Загрузка начальных данных
async function loadInitialData() {
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
    const response = await datasetService.preview(props.datasetId, {
      limit: PAGE_SIZE,
      offset: 0,
      search: debouncedSearchQuery.value || undefined
    })
    
    if (response.success && response.data) {
      allColumns.value = response.data.columns || props.cols || []
      allRows.value = response.data.rows || []
      hasMore.value = response.data.has_more || false
    }
  } catch (error) {
    console.error('Ошибка загрузки данных:', error)
  } finally {
    isLoading.value = false
  }
}

// Загрузка следующих страниц
async function loadMore() {
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
    }
  } catch (error) {
    console.error('Ошибка загрузки дополнительных данных:', error)
  } finally {
    isLoadingMore.value = false
  }
}

// Обработка скролла до конца
function handleScrollEnd() {
  if (hasMore.value && !isLoadingMore.value) {
    loadMore()
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
  const fields = (allColumns.value.length > 0 ? allColumns.value : (props.cols || [])).map(toField)
  return allRows.value.map(rowArr =>
    fields.reduce((obj, field, idx) => ({ ...obj, [field]: rowArr[idx] }), {})
  )
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

const visibleRows = computed(() => sortedRows.value)

const loadedRowsCount = computed(() => allRows.value.length)

function handleSort({ column, direction }) {
  sortState.value = { column, direction }
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
  padding: 5px;
  gap: 10px;
}

.main-title {
    display: flex;
    justify-content: start;
    align-items: center;
    flex: 0 0 auto;
    width: auto;
    gap: 15px;
    flex-wrap: wrap;
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
    justify-content: center;
    gap: 10px;
}

.input-label-left,
.input-label-right {
    min-width: 100px;
    text-align: right;
}

.input-value {
  font-weight: bold;
  min-width: 60px;
}

input {
    max-width: 70px;
}

.main-grid {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
}

.loading-more {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  font-size: 0.875rem;
}

.loading-placeholder,
.no-data-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: var(--color-secondary-text, #6c757d);
}

.no-data-placeholder {
  font-size: 1.1rem;
}

// Адаптивность для мобильных устройств
@media (max-width: 768px) {
  .main-title {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-container {
    max-width: 100%;
  }
  
  .title-input {
    justify-content: flex-start;
  }
}
</style>
