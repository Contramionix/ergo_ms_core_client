<template>
    <div class="csv-preview">
      <div class="toolbar">
        <div class="code">
          <label>Кодировка</label>
          <select class="form-select form-select-sm" id="smallSelect" v-model="encoding">
            <option value="utf-8">utf-8</option>
            <option value="utf-8-sig">utf-8-sig</option>
            <option value="utf16">utf16</option>
            <option value="windows-1251">windows-1251</option>
          </select>
        </div>
        <div class="separate">
          <label>Разделитель</label>
          <select class="form-select form-select-sm" id="smallSelect" v-model="delimiter">
            <option value=",">Запятая</option>
            <option value=";">Точка с запятой</option>
            <option value="\t">Табуляция</option>
          </select>
        </div>
        <div class="header_col">
          <label>Заголовок столбцов</label>
          <div class="toggle-group">
            <button :class="{ active: hasHeader }" @click="hasHeader = true">Да</button>
            <button :class="{ active: !hasHeader }" @click="hasHeader = false">Нет</button>
          </div>
        </div>
        <div class="search-wrapper">
          <input class="form-control" list="datalistOptions" id="dataListInput" type="text" placeholder="Поиск по столбцу" v-model="searchQuery" />
        </div>
      </div>
  
      <div v-if="errorState" class="error-message">
        <h2>Ошибка</h2>
        <p>{{ errorState }}</p>
      </div>
  
      <div class="table-wrapper" v-if="columns.length && !errorState">
        <table class="csv-table">
          <thead>
            <tr>
              <th v-for="(col, index) in columns" :key="index">
                <div class="col-header">
                  <div class="type-button-wrapper" @click.stop="toggleMenu(index)">
                    <span class="type-icon">{{ typeIcons[columnTypes[index]] }}</span>
                    <div v-if="activeMenuIndex === index" class="type-menu">
                      <div
                        v-for="type in getAllowedTypes(index)"
                        :key="type"
                        :class="['type-option', { active: columnTypes[index] === type }]"
                        @click.stop="setType(index, type)"
                      >
                        {{ typeLabels[type] }}
                      </div>
                    </div>
                  </div>
                  <span>{{ col }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="(isLoading || isLoadingPage) && paginatedRows.length === 0">
              <tr>
                <td :colspan="columns.length" class="loading-cell">
                  <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                  </div>
                </td>
              </tr>
            </template>
            <template v-else-if="!isLoading && !isLoadingPage && paginatedRows.length === 0">
              <tr>
                <td :colspan="columns.length" class="no-data-cell">
                  {{ searchQuery ? 'Ничего не найдено' : 'Нет данных' }}
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="(row, rowIndex) in paginatedRows" :key="rowIndex">
                <td v-for="(cell, colIndex) in row" :key="colIndex">{{ cell }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div v-if="totalRowsCount > 0 || paginatedRows.length > 0" class="pagination-container">
        <button 
          class="pagination-btn" 
          :disabled="currentPage === 1 || isLoading || isLoadingPage"
          @click="goToPage(currentPage - 1)"
        >
          <ChevronLeft :size="16" />
        </button>
        
        <div class="pagination-pages">
          <button 
            v-for="page in visiblePages" 
            :key="page"
            class="pagination-page"
            :class="{ 'pagination-page--active': page === currentPage }"
            :disabled="isLoading || isLoadingPage"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          class="pagination-btn" 
          :disabled="currentPage === totalPages || isLoading"
          @click="goToPage(currentPage + 1)"
        >
          <ChevronRight :size="16" />
        </button>
        
        <div class="pagination-goto">
          <input 
            type="number" 
            class="pagination-input"
            v-model.number="pageInput"
            :min="1"
            :max="totalPages"
            :placeholder="String(currentPage)"
            :disabled="isLoading || isLoadingPage"
            @keydown.enter="goToInputPage"
          />
          <span class="pagination-goto-label">/ {{ totalPages }}</span>
          <button 
            class="pagination-goto-btn"
            :disabled="!pageInput || pageInput < 1 || pageInput > totalPages || isLoading"
            @click="goToInputPage"
          >
            Перейти
          </button>
        </div>
        
        <span class="pagination-info">
          {{ paginationStart }}-{{ paginationEnd }} из {{ totalRowsCount }}
        </span>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, onBeforeUnmount, watchEffect, watch } from 'vue'
  import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
  import { apiClient } from '@/js/api/manager'
  import { endpoints } from '@/js/api/endpoints'
  
  const props = defineProps({ 
    file: Object,
    isLoading: Boolean
  })
  
  const encoding = ref('utf-8')
  const delimiter = ref(',')
  const hasHeader = ref(true)
  const searchQuery = ref('')
  const rawData = ref([])
  const errorState = ref(null)
  const isLoadingPage = ref(false)
  
  // Пагинация строк
  const ITEMS_PER_PAGE = parseInt(import.meta.env.VITE_BI_PREVIEW_ITEMS_PER_PAGE || '20', 10)
  const currentPage = ref(1)
  const pageInput = ref(null)
  const totalRowsCount = ref(0)
  const pagesCache = ref(new Map()) // Кэш загруженных страниц { page: [rows] }
  const loadingPages = ref(new Set()) // Страницы, которые сейчас загружаются
  
  const typeLabels = {
    string: 'Строка',
    integer: 'Целое число',
    float: 'Дробное число'
  }
  
  const typeIcons = {
    string: '☰',
    integer: '#',
    float: '#.#'
  }
  
  const columns = computed(() => {
    // Получаем заголовки из кэша текущей страницы или из rawData
    const cachedPage = pagesCache.value.get(currentPage.value)
    const dataSource = cachedPage || rawData.value
    
    if (hasHeader.value && dataSource.length > 0) {
      return dataSource[0]
    } else if (dataSource.length > 0) {
      return dataSource[0]?.map((_, i) => `Колонка ${i + 1}`) || []
    }
    return []
  })
  
  const rows = computed(() =>
    hasHeader.value ? rawData.value.slice(1) : rawData.value
  )

  const filteredRows = computed(() => {
    if (!searchQuery.value) return rows.value
    return rows.value.filter(row =>
      row.some(cell => String(cell).toLowerCase().includes(searchQuery.value.toLowerCase()))
    )
  })
  
  // Пагинация
  const totalPages = computed(() => {
    if (totalRowsCount.value === 0) {
      // Если totalRowsCount еще не загружен, но есть данные на текущей странице
      // показываем хотя бы 1 страницу
      const currentRows = paginatedRows.value.length
      if (currentRows > 0) {
        return 1
      }
      return 1
    }
    return Math.ceil(totalRowsCount.value / ITEMS_PER_PAGE) || 1
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
  
  const paginationStart = computed(() => {
    if (totalRowsCount.value === 0) return 0
    return (currentPage.value - 1) * ITEMS_PER_PAGE + 1
  })
  
  const paginationEnd = computed(() => {
    return Math.min(currentPage.value * ITEMS_PER_PAGE, totalRowsCount.value)
  })
  
  // Получаем строки текущей страницы
  const paginatedRows = computed(() => {
    // Если есть поиск, используем клиентскую пагинацию из filteredRows
    if (searchQuery.value) {
      const start = (currentPage.value - 1) * ITEMS_PER_PAGE
      const end = start + ITEMS_PER_PAGE
      return filteredRows.value.slice(start, end)
    }
    
    // Без поиска используем серверную пагинацию из кэша
    const cachedPage = pagesCache.value.get(currentPage.value)
    if (cachedPage) {
      // Если есть заголовок, убираем его для отображения (заголовок уже в columns)
      if (hasHeader.value && cachedPage.length > 0) {
        return cachedPage.slice(1)
      }
      return cachedPage
    }
    
    // Если страница не закэширована, возвращаем пустой массив
    return []
  })
  
  // Загрузка конкретной страницы
  async function loadPage(page) {
    if (!props.file?.id) return
    
    // Если страница уже в кэше, не загружаем
    if (pagesCache.value.has(page)) {
      return
    }
    
    // Если страница уже загружается, не загружаем повторно
    if (loadingPages.value.has(page)) {
      return
    }
    
    loadingPages.value.add(page)
    isLoadingPage.value = true
    
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE
      const params = {
        encoding: encoding.value,
        delimiter: delimiter.value,
        has_header: hasHeader.value,
        limit: ITEMS_PER_PAGE,
        offset: offset
      }
      
      const res = await apiClient.get(`${endpoints.bi.Upload}${props.file.id}/`, params)
      
      if (res.success && res.data?.parsed) {
        const parsed = res.data.parsed
        pagesCache.value.set(page, parsed)
        
        // Обновляем общее количество строк
        if (res.data.total_count !== undefined && res.data.total_count !== null) {
          totalRowsCount.value = res.data.total_count
        } else {
          // Если total_count не пришел, пытаемся оценить по количеству загруженных строк
          const loadedRows = hasHeader.value && parsed.length > 0 ? parsed.length - 1 : parsed.length
          if (loadedRows === ITEMS_PER_PAGE) {
            // Если загружено ровно ITEMS_PER_PAGE строк, значит может быть еще страницы
            const minTotal = offset + loadedRows + 1
            if (totalRowsCount.value < minTotal) {
              totalRowsCount.value = minTotal
            }
          } else {
            // Если загружено меньше ITEMS_PER_PAGE, значит это последняя страница
            totalRowsCount.value = offset + loadedRows
          }
        }
        
        // Обновляем rawData для отображения текущей страницы
        if (page === currentPage.value) {
          rawData.value = parsed
        }
      }
    } catch {
      // Ошибка загрузки страницы обрабатывается silently
    } finally {
      isLoadingPage.value = false
      loadingPages.value.delete(page)
    }
  }
  
  // Переход на страницу
  async function goToPage(page) {
    const total = totalPages.value
    if (page >= 1 && page <= total) {
      currentPage.value = page
      
      // Загружаем страницу если её нет в кэше
      if (!pagesCache.value.has(page)) {
        await loadPage(page)
      } else {
        // Обновляем rawData из кэша
        rawData.value = pagesCache.value.get(page)
      }
    }
  }
  
  async function goToInputPage() {
    if (pageInput.value && pageInput.value >= 1 && pageInput.value <= totalPages.value) {
      await goToPage(pageInput.value)
      pageInput.value = null
    }
  }
  
  const columnTypes = ref([])
  const activeMenuIndex = ref(null)
  
  watchEffect(() => {
    const types = []
    const rowData = rows.value
    if (!rowData.length) return
  
    for (let i = 0; i < rowData[0].length; i++) {
      const values = rowData.map(row => row[i])
      let isInt = true
      let isFloat = true
  
      for (const val of values) {
        if (val === '') continue
        if (!/^[-+]?\d+$/.test(val)) isInt = false
        if (!/^[-+]?\d*(\.\d+)?$/.test(val)) isFloat = false
      }
  
      if (isInt) types.push('integer')
      else if (isFloat) types.push('float')
      else types.push('string')
    }
  
    columnTypes.value = types
  })
  
  watch([encoding, delimiter, hasHeader], async () => {
    if (props.file?.id) {
      // Сбрасываем кэш и загружаем первую страницу
      pagesCache.value.clear()
      currentPage.value = 1
      totalRowsCount.value = 0
      await loadPage(1)
    } else if (props.file?.originalFile instanceof File) {
      await previewCsvLocally(props.file.originalFile)
    }
  })
  
  function getAllowedTypes(colIndex) {
    const values = rows.value.map(row => row[colIndex])
    let isInt = true
    let isFloat = true
  
    for (const val of values) {
      if (val === '') continue
      if (!/^[-+]?\d+$/.test(val)) isInt = false
      if (!/^[-+]?\d*(\.\d+)?$/.test(val)) isFloat = false
    }
  
    if (isInt) return ['string', 'integer', 'float']
    if (isFloat) return ['string', 'float']
    return ['string']
  }
  
  function toggleMenu(index) {
    activeMenuIndex.value = activeMenuIndex.value === index ? null : index
  }
  
  function setType(index, type) {
    columnTypes.value[index] = type
    activeMenuIndex.value = null
  }
  
  function handleClickOutside(event) {
    const menus = document.querySelectorAll('.type-menu')
    if (![...menus].some(menu => menu.contains(event.target))) {
      activeMenuIndex.value = null
    }
  }

  async function previewCsvLocally(file) {
  errorState.value = null

  try {
    const text = await file.text()
    const sep = delimiter.value === '\\t' ? '\t' : delimiter.value
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')
    const parsed = lines.map(line => line.split(sep))

    if (parsed.length && !hasHeader.value) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const colCount = parsed[0].length
      const headers = Array.from({ length: colCount }, (_, i) =>
        alphabet[i] || `Col ${i + 1}`
      )
      parsed.unshift(headers)
    }

    rawData.value = parsed
  } catch (err) {
    errorState.value = 'Ошибка чтения CSV: ' + err.message
    rawData.value = []
  }
}
  
  onMounted(async () => {
    document.addEventListener('click', handleClickOutside)
    if (props.file?.originalFile instanceof File) {
      await previewCsvLocally(props.file.originalFile)
    } else if (props.file?.id) {
      // Загружаем первую страницу с пагинацией
      await loadPage(1)
    }
  })

  // Удалено - уже обрабатывается в watch([encoding, delimiter, hasHeader])

watch(() => props.file, async (newFile, oldFile) => {
  // Проверяем, что файл существует и изменился
  if (newFile && newFile !== oldFile) {
    // Если файл был удален (нет id и нет originalFile), просто очищаем данные
    if (!newFile.id && !newFile.originalFile && !newFile.temp_path) {
      errorState.value = null
      rawData.value = []
      pagesCache.value.clear()
      currentPage.value = 1
      totalRowsCount.value = 0
      return
    }
    // Перезагружаем данные при изменении файла
    if (newFile.originalFile instanceof File) {
      await previewCsvLocally(newFile.originalFile)
    } else if (newFile.id) {
      // Сбрасываем кэш и загружаем первую страницу
      pagesCache.value.clear()
      currentPage.value = 1
      totalRowsCount.value = 0
      await loadPage(1)
    }
  }
}, { deep: true })
  
  onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
  
  // Удалено - теперь используется loadPage для загрузки с пагинацией
</script>
  
  <style scoped lang="scss">
  .csv-preview {
    display: flex;
    justify-content: center;
    flex-direction: column;
    padding: 1rem;
    color: var(--color-primary-text);
    font-size: 0.9rem;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .error-message {
    text-align: center;
    padding: 2rem;
    border: 1px solid var(--color-accent);
    background: var(--color-primary-background);
    color: var(--color-accent);
    border-radius: 12px;
    margin-top: 1rem;
  }
  
  .csv-table th span {
    font-weight: bold;
    color: var(--color-primary-text);
    letter-spacing: 0.3px;
  }

  .csv-table thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: var(--color-primary-background);
  }

  .csv-table th {
    min-width: 120px;
    position: sticky;
    top: 0;
    background-color: var(--color-primary-background);
    z-index: 5;
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
  
  .toolbar label {
    margin-right: 4px;
    font-weight: 600;
  }

  .separate{
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .toggle-group {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.toggle-group button {
  padding: 4px 10px;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  font-weight: 500;
}

.toggle-group button:not(:last-child) {
  border-right: 1px solid var(--color-border);
}

.toggle-group button.active {
  background: var(--color-hover-background);
}
  
  .header_col {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .search-wrapper {
    flex: 1;
    min-width: 0;
  }

  .table-wrapper {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    position: relative;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background-color: var(--color-primary-background);
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
  
  .csv-table {
    width: 100%;
    border-collapse: collapse;
    position: relative;
  }
  
  .csv-table th,
  .csv-table td {
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    background-color: var(--color-primary-background);
  }
  
  .csv-table th {
    background-color: var(--color-primary-background);
    font-weight: bold;
    text-align: left;
    position: relative;
  }
  
  .csv-table tr:hover td {
    background-color: var(--color-hover-background);
  }
  
  .col-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .type-button-wrapper {
    position: relative;
    cursor: pointer;
    font-size: 0.8rem;
    background: var(--color-primary-background);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px 5px;
    color: var(--color-secondary-text);
    transition: background 0.2s ease;
  }
  
  .type-button-wrapper:hover {
    background-color: var(--color-hover-background);
  }
  
  .type-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: var(--color-primary-background);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    z-index: 10;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    min-width: 130px;
    padding: 4px 0;
  }
  
  .type-option {
    padding: 6px 10px;
    font-size: 0.85rem;
    color: var(--color-primary-text);
    cursor: pointer;
    transition: background 0.15s ease;
  }
  
  .type-option:hover {
    background-color: var(--color-hover-background);
  }
  
  .type-option.active {
    background-color: var(--color-hover-background);
    color: var(--color-primary-text);
  }

  .code{
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .loading-cell, .no-data-cell {
    text-align: center;
    padding: 2rem;
    color: var(--color-secondary-text);
  }
  
  /* Pagination styles */
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
  }

  .pagination-btn:hover:not(:disabled) {
    background: var(--color-hover-background);
    border-color: var(--color-accent);
  }

  .pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
  }

  .pagination-page:hover:not(.pagination-page--active) {
    background: var(--color-hover-background);
    color: var(--color-primary-text);
  }

  .pagination-page--active {
    background: var(--color-accent);
    color: var(--color-primary-background);
    font-weight: 600;
    cursor: default;
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
  }

  .pagination-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(229, 57, 53, 0.15);
  }

  .pagination-input::placeholder {
    color: var(--color-secondary-text);
  }

  .pagination-input::-webkit-outer-spin-button,
  .pagination-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
  }
  .pagination-input {
    -moz-appearance: textfield;
    appearance: textfield;
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
  }

  .pagination-goto-btn:hover:not(:disabled) {
    background: var(--color-hover-background);
    border-color: var(--color-accent);
  }

  .pagination-goto-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pagination-info {
    margin-left: auto;
    font-size: 12px;
    color: var(--color-secondary-text);
  }

  @media (max-width: 768px) {
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
  