<template>
  <div class="xlsx-preview">
    <div class="toolbar">
      <div class="header-wrapper">
        <label>Заголовок столбцов</label>
        <div class="toggle-group">
          <button :class="{ active: hasHeader }" @click="hasHeader = true">Да</button>
          <button :class="{ active: !hasHeader }" @click="hasHeader = false">Нет</button>
        </div>
      </div>
      <div class="search-wrapper">
        <input 
          class="form-control" 
          type="text" 
          placeholder="Поиск по таблице"
          v-model="searchQuery" 
        />
      </div>
    </div>

    <div v-if="errorState" class="error-message">
      <h2>Ошибка</h2>
      <p>{{ errorState }}</p>
    </div>

    <div class="table-container" v-if="columns.length && !errorState">
      <div class="table-header-wrapper" ref="headerWrapperRef">
        <div class="table-header-fixed" ref="headerRef">
          <div class="table-row header-row">
            <div 
              v-for="(col, index) in columns" 
              :key="index"
              class="table-cell header-cell"
              :style="{ width: columnWidths[index] || '150px' }"
            >
              <div class="col-header">
                <span class="type-icon">{{ typeIcons[columnTypes[index]] }}</span>
                <span>{{ col }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <RecycleScroller
        ref="scrollerRef"
        class="scroller"
        :items="filteredRows"
        :item-size="rowHeight"
        key-field="__index"
        :page-mode="false"
        :buffer="200"
        :min-item-size="rowHeight"
        v-slot="{ item, index }"
      >
        <div 
          class="table-row" 
          :class="{ selected: selectedRow === index }"
          @click="selectRow(index)"
        >
          <div 
            v-for="(colIndex) in columns.length" 
            :key="colIndex - 1"
            class="table-cell"
            :style="{ width: columnWidths[colIndex - 1] || '150px' }"
          >
            {{ getCellValue(item, colIndex - 1) }}
          </div>
        </div>
      </RecycleScroller>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

const props = defineProps({ 
  file: Object,
  isLoading: Boolean
})

const hasHeader = ref(true)
const rawData = ref([])
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const errorState = ref(null)
const selectedRow = ref(null)
const rowHeight = 35
const scrollerRef = ref(null)
const headerRef = ref(null)
const headerWrapperRef = ref(null)

// Кэш для загруженных данных
const dataCache = new Map()

onMounted(() => {
  fetchData()
  
  // Синхронизация горизонтального скролла
  nextTick(() => {
    // Ждем, пока RecycleScroller полностью инициализируется
    setTimeout(() => {
      setupScrollSync()
    }, 200)
  })
})

function setupScrollSync() {
  // Очищаем предыдущие обработчики, если они есть
  if (scrollerRef.value) {
    const prevElement = scrollerRef.value._actualScrollElement
    if (prevElement) {
      if (scrollerRef.value._syncBodyToHeader) {
        prevElement.removeEventListener('scroll', scrollerRef.value._syncBodyToHeader)
      }
    }
    if (headerWrapperRef.value && scrollerRef.value._syncHeaderToBody) {
      headerWrapperRef.value.removeEventListener('scroll', scrollerRef.value._syncHeaderToBody)
    }
  }
  
  if (!scrollerRef.value || !headerWrapperRef.value) return
  
  const scrollerEl = scrollerRef.value.$el || scrollerRef.value
  if (!scrollerEl) return
  
  // Находим реальный скроллируемый элемент
  // У RecycleScroller скролл может быть на самом элементе или на внутреннем контейнере
  let actualScrollElement = null
  
  // Сначала проверяем сам элемент (у него overflow-x: auto)
  if (scrollerEl.scrollWidth > scrollerEl.clientWidth) {
    actualScrollElement = scrollerEl
  } else if (scrollerEl.querySelector) {
    // Ищем внутренний контейнер RecycleScroller
    const innerContainer = scrollerEl.querySelector('.vue-recycle-scroller')
    if (innerContainer) {
      // Проверяем, есть ли скролл на внутреннем контейнере
      if (innerContainer.scrollWidth > innerContainer.clientWidth) {
        actualScrollElement = innerContainer
      } else {
        // Если скролла нет, используем сам элемент (скролл будет на нем)
        actualScrollElement = scrollerEl
      }
    } else {
      // Если не нашли внутренний контейнер, используем сам элемент
      actualScrollElement = scrollerEl
    }
  } else {
    actualScrollElement = scrollerEl
  }
  
  if (!actualScrollElement || !headerWrapperRef.value) return
  
  let isSyncing = false
  
  // Синхронизация скролла тела таблицы -> заголовок
  const syncBodyToHeader = () => {
    if (isSyncing) return
    isSyncing = true
    requestAnimationFrame(() => {
      if (headerWrapperRef.value && actualScrollElement) {
        headerWrapperRef.value.scrollLeft = actualScrollElement.scrollLeft
      }
      isSyncing = false
    })
  }
  
  // Синхронизация скролла заголовка -> тело таблицы
  const syncHeaderToBody = () => {
    if (isSyncing) return
    isSyncing = true
    requestAnimationFrame(() => {
      if (actualScrollElement && headerWrapperRef.value) {
        actualScrollElement.scrollLeft = headerWrapperRef.value.scrollLeft
      }
      isSyncing = false
    })
  }
  
  // Добавляем обработчики событий
  actualScrollElement.addEventListener('scroll', syncBodyToHeader, { passive: true })
  headerWrapperRef.value.addEventListener('scroll', syncHeaderToBody, { passive: true })
  
  // Сохраняем ссылки для очистки
  scrollerRef.value._syncBodyToHeader = syncBodyToHeader
  scrollerRef.value._syncHeaderToBody = syncHeaderToBody
  scrollerRef.value._actualScrollElement = actualScrollElement
}

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  // Очистка обработчиков скролла
  if (scrollerRef.value) {
    const actualScrollElement = scrollerRef.value._actualScrollElement || scrollerRef.value.$el || scrollerRef.value
    if (actualScrollElement && scrollerRef.value._syncBodyToHeader) {
      actualScrollElement.removeEventListener('scroll', scrollerRef.value._syncBodyToHeader)
    }
    if (headerWrapperRef.value && scrollerRef.value._syncHeaderToBody) {
      headerWrapperRef.value.removeEventListener('scroll', scrollerRef.value._syncHeaderToBody)
    }
  }
  
  // Очистка локальных кэшей
  cachedFilteredRows = null
  cachedFilterQuery = null
  cachedRowsData = null
  cachedColumnWidths = null
  cachedColumnsForWidths = null
})

const typeIcons = {
  string: '☰',
  integer: '#',
  float: '#.#'
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Дебаунс для поиска
let searchDebounceTimer = null
watch(searchQuery, (newVal) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    debouncedSearchQuery.value = newVal
  }, 300)
})

const columns = computed(() => {
  if (!rawData.value.length) return []
  if (hasHeader.value) return rawData.value[0]
  return rawData.value[0].map((_, i) => alphabet[i] || `Col ${i + 1}`)
})

const rows = computed(() =>
  hasHeader.value ? rawData.value.slice(1) : rawData.value
)

// Кэш для отфильтрованных строк
let cachedFilteredRows = null
let cachedFilterQuery = null
let cachedRowsData = null

// Оптимизированная фильтрация с кэшированием
const filteredRows = computed(() => {
  let dataRows = rows.value
  
  // Если данные не изменились и запрос не изменился, возвращаем кэш
  if (cachedFilteredRows && 
      cachedFilterQuery === debouncedSearchQuery.value && 
      cachedRowsData === dataRows) {
    return cachedFilteredRows
  }
  
  let result
  
  if (!debouncedSearchQuery.value) {
    // Для RecycleScroller возвращаем массив объектов с уникальным ключом
    result = dataRows.map((row, idx) => {
      const rowObj = { 
        __index: idx,
        _cells: row // Сохраняем массив ячеек
      }
      return rowObj
    })
  } else {
    const query = debouncedSearchQuery.value.toLowerCase()
    const results = []
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (row.some(cell => String(cell).toLowerCase().includes(query))) {
        results.push({ 
          __index: i,
          _cells: row
        })
      }
    }
    
    result = results
  }
  
  // Сохраняем в кэш
  cachedFilteredRows = result
  cachedFilterQuery = debouncedSearchQuery.value
  cachedRowsData = dataRows
  
  return result
})

// Кэш для ширины колонок
let cachedColumnWidths = null
let cachedColumnsForWidths = null

// Автоматический расчет ширины колонок с кэшированием
const columnWidths = computed(() => {
  if (!columns.value.length) return []
  
  // Если колонки не изменились, возвращаем кэш
  if (cachedColumnWidths && 
      cachedColumnsForWidths === columns.value && 
      cachedColumnsForWidths.length === columns.value.length) {
    return cachedColumnWidths
  }
  
  const widths = []
  const minWidth = 100
  const maxWidth = 300
  
  // Используем только первые 50 строк для расчета (вместо 100) для ускорения
  const sampleSize = Math.min(50, filteredRows.value.length)
  const sampleRows = filteredRows.value.slice(0, sampleSize)
  
  for (let i = 0; i < columns.value.length; i++) {
    const colName = String(columns.value[i])
    let maxLength = colName.length
    
    // Оптимизированный поиск максимальной длины
    for (let j = 0; j < sampleRows.length; j++) {
      const cell = sampleRows[j]._cells ? sampleRows[j]._cells[i] : ''
      const cellLength = String(cell || '').length
      if (cellLength > maxLength) {
        maxLength = cellLength
      }
    }
    
    widths.push(Math.min(Math.max(maxLength * 8 + 20, minWidth), maxWidth) + 'px')
  }
  
  // Сохраняем в кэш
  cachedColumnWidths = widths
  cachedColumnsForWidths = columns.value
  
  return widths
})

const columnTypes = ref([])

function detectTypes() {
  const types = []
  const dataRows = rows.value
  if (!dataRows.length) return

  // Проверяем только первые 500 строк для производительности
  const sampleSize = Math.min(500, dataRows.length)
  const sampleRows = dataRows.slice(0, sampleSize)

  for (let i = 0; i < dataRows[0].length; i++) {
    const values = sampleRows.map(row => row[i]).filter(val => val !== '')
    if (values.length === 0) {
      types.push('string')
      continue
    }

    let isInt = true
    let isFloat = true

    for (const val of values) {
      if (val === '') continue
      const str = String(val)
      
      // Быстрая проверка на целое число
      if (isInt) {
        let hasDigits = false
        let startIdx = 0
        if (str[0] === '-' || str[0] === '+') startIdx = 1
        
        for (let j = startIdx; j < str.length; j++) {
          const char = str[j]
          if (char >= '0' && char <= '9') {
            hasDigits = true
          } else {
            isInt = false
            break
          }
        }
        if (!hasDigits) isInt = false
      }
      
      // Проверка на float
      if (isFloat && !isInt) {
        let hasDigits = false
        let hasDot = false
        let startIdx = 0
        if (str[0] === '-' || str[0] === '+') startIdx = 1
        
        for (let j = startIdx; j < str.length; j++) {
          const char = str[j]
          if (char >= '0' && char <= '9') {
            hasDigits = true
          } else if (char === '.' && !hasDot) {
            hasDot = true
          } else {
            isFloat = false
            break
          }
        }
        if (!hasDigits) isFloat = false
      }
      
      if (!isInt && !isFloat) break
    }

    if (isInt) types.push('integer')
    else if (isFloat) types.push('float')
    else types.push('string')
  }

  columnTypes.value = types
}

function formatDate(val) {
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val)) {
    return val.toLocaleDateString('ru-RU')
  }
  return val
}

async function previewXlsxLocally(file, sheetName) {
  if (!(file instanceof Blob)) throw new Error('Требуется файл типа Blob');
  
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule.ExcelJS || ExcelJSModule;
  const Workbook = ExcelJS.Workbook || ExcelJS;
  
  if (typeof Workbook !== 'function') {
    throw new Error('Workbook не является конструктором');
  }
  
  const workbook = new Workbook();
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        await workbook.xlsx.load(e.target.result);
        const worksheet = sheetName
          ? workbook.getWorksheet(sheetName)
          : workbook.worksheets[0];
        if (!worksheet) return reject(new Error('Не найден лист'));

        const parsed = [];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          parsed.push(row.values.slice(1).map(cell => cell ?? ""));
        });
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

async function fetchData() {
  if (!props.file) return

  errorState.value = null

  try {
    let parsed = null
    const cacheKey = props.file.id ? `file_${props.file.id}_${hasHeader.value}` : 
                     props.file.temp_path ? `temp_${props.file.temp_path}_${hasHeader.value}` : null

    // Проверяем кэш для уже загруженных файлов
    if (cacheKey && dataCache.has(cacheKey)) {
      const cached = dataCache.get(cacheKey)
      rawData.value = cached.data
      
      // Восстанавливаем типы из кэша
      if (cached.types) {
        columnTypes.value = cached.types
      } else {
        detectTypes()
        // Сохраняем типы в кэш
        if (cacheKey) {
          const cachedData = dataCache.get(cacheKey)
          if (cachedData) {
            cachedData.types = columnTypes.value
          }
        }
      }
      
      // Очищаем кэш фильтрации при загрузке новых данных
      cachedFilteredRows = null
      cachedFilterQuery = null
      cachedRowsData = null
      cachedColumnWidths = null
      cachedColumnsForWidths = null
      
      return
    }

    const isLocalFile = props.file.originalFile instanceof File || props.file.originalFile instanceof Blob

    if (isLocalFile) {
      parsed = await previewXlsxLocally(
        props.file.originalFile,
        props.file.sheet
      )
    } else if (props.file.id || (props.file.temp_path && !props.file.temp_path.includes(':\\'))) {
      let res

      try {
        if (props.file.id) {
          res = await apiClient.get(`${endpoints.bi.Upload}${props.file.id}/?has_header=${hasHeader.value}`)
        } else {
          res = await apiClient.post('/bi_analysis/bi_datasets/xlsx/preview/', {
            temp_path: props.file.temp_path,
            has_header: hasHeader.value,
            row_limit: 1000  // Загружаем первые 1000 строк
          })
        }

        // Проверяем, не был ли файл удален (404 ошибка)
        if (res.status === 404 || (!res.success && res.status === 404)) {
          throw new Error('Файл был удален')
        }

        if (!res.success || !res.data?.parsed?.length) {
          throw new Error('Ошибка загрузки файла')
        }
      } catch (apiError) {
        // Если это ошибка 404, значит файл был удален
        if (apiError.response?.status === 404 || apiError.status === 404) {
          throw new Error('Файл был удален')
        }
        throw apiError
      }

      parsed = res.data.parsed.map(row =>
        row.map(cell => (cell == null ? '' : String(formatDate(cell))))
      )
    } else {
      throw new Error('Файл не поддерживается или не загружен')
    }

    rawData.value = parsed
    
    // Определяем типы
    detectTypes()
    
    // Сохраняем в кэш (только для файлов с id или temp_path)
    if (cacheKey) {
      // Ограничиваем размер кэша (максимум 10 файлов)
      if (dataCache.size >= 10) {
        const firstKey = dataCache.keys().next().value
        dataCache.delete(firstKey)
      }
      
      dataCache.set(cacheKey, {
        data: parsed,
        types: columnTypes.value
      })
    }
    
    // Очищаем кэш фильтрации при загрузке новых данных
    cachedFilteredRows = null
    cachedFilterQuery = null
    cachedRowsData = null
    cachedColumnWidths = null
    cachedColumnsForWidths = null
  } catch (e) {
    // Проверяем, не была ли это ошибка 404 (файл удален)
    if (e.response?.status === 404 || e.status === 404 || e.message?.includes('404') || e.message?.includes('удален')) {
      // Если файл был удален, просто логируем и не показываем ошибку в UI
      // (пользователь уже переключен на другой файл)
      console.log('[XlsxPreviewOptimized] Файл был удален, переключение на другой файл')
      errorState.value = null
      rawData.value = []
      return
    }
    // Для других ошибок показываем сообщение
    console.error('[XlsxPreviewOptimized] Ошибка предпросмотра:', e)
    errorState.value = e.message || 'Ошибка загрузки файла'
    rawData.value = []
  }
}

const selectRow = index => {
  selectedRow.value = index
}

function getCellValue(row, colIndex) {
  if (!row || !row._cells) return ''
  return row._cells[colIndex] ?? ''
}

watch(hasHeader, fetchData)

watch(() => props.file, (newFile, oldFile) => {
  // Проверяем, что файл существует и изменился
  if (newFile && newFile !== oldFile) {
    // Если файл был удален (нет id и нет temp_path), просто не загружаем данные
    if (!newFile.id && !newFile.temp_path && !newFile.originalFile) {
      errorState.value = null
      rawData.value = []
      return
    }
    fetchData()
  }
}, { deep: true })

// Переустанавливаем синхронизацию скролла при изменении данных (только при реальном изменении структуры)
let lastRowsLength = 0
let lastColumnsLength = 0

watch([() => filteredRows.value.length, () => columns.value.length], ([rowsLen, colsLen]) => {
  // Переустанавливаем только если изменилась структура (количество строк или колонок)
  if (rowsLen !== lastRowsLength || colsLen !== lastColumnsLength) {
    lastRowsLength = rowsLen
    lastColumnsLength = colsLen
    nextTick(() => {
      setTimeout(() => {
        setupScrollSync()
      }, 100)
    })
  }
})
</script>

<style scoped lang="scss">
.xlsx-preview {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  color: var(--color-primary-text);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex: 0 0 auto;
}

.header-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.toggle-group button {
  padding: 4px 10px;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  color: var(--color-primary-text);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toggle-group button.active {
  background: var(--color-accent);
}

.error-message {
  text-align: center;
  color: var(--color-accent);
  padding: 2rem;
  border: 1px solid var(--color-accent);
  background: var(--color-primary-background);
  border-radius: 12px;
}

.table-container {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
  position: relative;
  overflow: hidden;
  height: 0; // Важно для flex-контейнера
}

.table-header-wrapper {
  flex: 0 0 auto;
  overflow-x: auto;
  overflow-y: hidden;
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-primary-background);
  border-bottom: 2px solid var(--color-border);
  
  // Скрываем скроллбар шапки, так как скролл синхронизирован с телом
  scrollbar-width: none;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.table-header-fixed {
  width: max-content;
  min-width: 100%;
}

.scroller {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow-y: auto !important;
  overflow-x: auto !important;
  position: relative;
  
  // Скрываем скроллбар, но оставляем функциональность
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
  
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--color-border);
    border-radius: 4px;
  }
  
  // Важно: убеждаемся, что внутренний контейнер виртуализатора имеет правильные размеры
  :deep(.vue-recycle-scroller) {
    height: 100% !important;
    overflow: visible;
  }
  
  :deep(.vue-recycle-scroller__item-wrapper) {
    overflow: visible;
  }
}

.table-row {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  min-height: 35px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  width: max-content;  // Позволяет строке быть шире контейнера
  min-width: 100%;  // Минимальная ширина равна контейнеру
  
  &:hover {
    background-color: var(--color-hover-background);
  }
  
  &.selected {
    background-color: var(--color-hover-background);
  }
  
  &.header-row {
    cursor: default;
    background-color: var(--color-primary-background);
    font-weight: bold;
    
    &:hover {
      background-color: var(--color-primary-background);
    }
  }
}

.table-cell {
  padding: 6px 12px;
  border-right: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &.header-cell {
    background-color: var(--color-primary-background);
  }
}

.col-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-icon {
  font-size: 0.9rem;
  color: var(--color-secondary-text);
}

.search-wrapper {
  flex: 1;
  max-width: 300px;
}
</style>

