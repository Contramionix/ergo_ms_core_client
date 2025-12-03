<template>
  <div 
    v-if="show" 
    class="bi-charts-modal fade show d-block" 
    tabindex="-1"
    @drop.prevent="handleGlobalDrop"
    @dragover.prevent="handleGlobalDragOver"
  >
    <div 
      ref="modalDialogRef"
      class="modal-dialog modal-dialog-centered modal-xl"
      :style="modalStyle"
    >
      <div class="modal-content" :style="contentStyle">
        <div 
          class="modal-header"
          @mousedown="startDrag"
          style="cursor: move;"
        >
          <div class="d-flex align-items-center gap-2">
            <BarChart3 :size="24" class="text-primary" />
            <h5 class="modal-title mb-0">Построение графиков</h5>
          </div>
          <button 
            type="button" 
            class="btn-close" 
            @click="handleClose"
            :disabled="isLoading"
          ></button>
        </div>
        
        <div class="modal-body">
          <div class="d-flex justify-content-end mb-3">
            <button 
              class="btn btn-sm btn-danger text-white" 
              @click="goBack"
              :disabled="isLoading"
            >
              <ArrowLeft :size="14" class="me-1" />
              Назад
            </button>
          </div>
          <div v-if="isLoading" class="text-center py-5">
            <div class="spinner-border spinner-border-lg text-primary" role="status">
              <span class="visually-hidden">Загрузка данных...</span>
            </div>
            <div class="mt-3 text-muted">Загрузка данных из файла...</div>
          </div>

          <div v-else-if="error" class="alert alert-danger">
            {{ error }}
          </div>

          <div v-else-if="columns.length === 0" class="alert alert-warning">
            В файле нет данных для построения графиков.
          </div>

          <div v-else class="charts-container">
            <!-- Настройки графика -->
            <div class="chart-settings mb-4">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">Тип графика</label>
                  <select v-model="chartType" class="form-select">
                    <option value="bar">Столбчатая диаграмма</option>
                    <option value="line">Линейная диаграмма</option>
                    <option value="pie">Круговая диаграмма</option>
                    <option value="doughnut">Кольцевая диаграмма</option>
                    <option value="area">Областная диаграмма</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Ось X (категории)</label>
                  <select v-model="selectedXField" class="form-select">
                    <option value="">Выберите поле</option>
                    <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Ось Y (значения)</label>
                  <select v-model="selectedYField" class="form-select">
                    <option value="">Выберите поле</option>
                    <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- График -->
            <div v-if="canRenderChart" class="chart-wrapper">
              <component
                ref="chartRef"
                :is="chartComponent"
                :data="chartData"
                :options="chartOptions"
              />
            </div>

            <div v-else class="alert alert-info">
              Выберите поля для построения графика.
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="d-flex gap-2">
            <button 
              v-if="canRenderChart"
              type="button" 
              class="btn btn-primary" 
              @click="saveAsPNG"
              :disabled="isLoading || !canRenderChart"
              title="Сохранить как PNG"
            >
              <Download :size="16" class="me-1" />
              PNG
            </button>
            <button 
              v-if="canRenderChart"
              type="button" 
              class="btn btn-primary" 
              @click="saveAsJPEG"
              :disabled="isLoading || !canRenderChart"
              title="Сохранить как JPEG"
            >
              <Download :size="16" class="me-1" />
              JPEG
            </button>
            <button 
              v-if="canRenderChart"
              type="button" 
              class="btn btn-primary" 
              @click="copyToClipboard"
              :disabled="isLoading || !canRenderChart"
              title="Копировать в буфер обмена"
            >
              <Copy :size="16" class="me-1" />
              Копировать
            </button>
          </div>
        </div>
        
        <!-- Handles для изменения размера -->
        <!-- Углы -->
        <div 
          class="resize-handle resize-handle-nw"
          @mousedown="(e) => startResize(e, 'nw')"
          title="Изменить размер"
        ></div>
        <div 
          class="resize-handle resize-handle-ne"
          @mousedown="(e) => startResize(e, 'ne')"
          title="Изменить размер"
        ></div>
        <div 
          class="resize-handle resize-handle-sw"
          @mousedown="(e) => startResize(e, 'sw')"
          title="Изменить размер"
        ></div>
        <div 
          class="resize-handle resize-handle-se"
          @mousedown="(e) => startResize(e, 'se')"
          title="Изменить размер"
        ></div>
        <!-- Края -->
        <div 
          class="resize-handle resize-handle-n"
          @mousedown="(e) => startResize(e, 'n')"
          title="Изменить высоту"
        ></div>
        <div 
          class="resize-handle resize-handle-s"
          @mousedown="(e) => startResize(e, 's')"
          title="Изменить высоту"
        ></div>
        <div 
          class="resize-handle resize-handle-w"
          @mousedown="(e) => startResize(e, 'w')"
          title="Изменить ширину"
        ></div>
        <div 
          class="resize-handle resize-handle-e"
          @mousedown="(e) => startResize(e, 'e')"
          title="Изменить ширину"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, shallowRef, nextTick } from 'vue'
import { BarChart3, Download, Copy, ArrowLeft } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { Bar, Line, Pie, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { biAnalysisService } from '@/core/bi/js/biAnalysisService.js'

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  fileId: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['close'])

const toast = useToast()
const chartRef = ref(null)
const modalDialogRef = ref(null)

// Состояние для перетаскивания модального окна
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const modalPosition = ref({ x: null, y: null })

// Состояние для изменения размера
const isResizing = ref(false)
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 })
const resizeDirection = ref('') // 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
const modalSize = ref({ width: null, height: null })

// Флаг, показывающий, был ли построен график (для сохранения состояния)
const hasChart = ref(false)

const isLoading = ref(false)
const error = ref(null)
const columns = ref([])
const data = ref([])
const chartType = ref('bar')
const selectedXField = ref('')
const selectedYField = ref('')

// Вычисляем стили для модального окна
const modalStyle = computed(() => {
  const style = {}
  
  if (modalPosition.value.x !== null && modalPosition.value.y !== null) {
    style.position = 'fixed'
    style.top = `${modalPosition.value.y}px`
    style.left = `${modalPosition.value.x}px`
    style.margin = '0'
    style.transform = 'none'
  }
  
  if (modalSize.value.width !== null) {
    style.width = `${modalSize.value.width}px`
    style.maxWidth = 'none'
  }
  
  if (modalSize.value.height !== null) {
    style.height = `${modalSize.value.height}px`
    style.maxHeight = 'none'
  }
  
  return style
})

// Стили для содержимого модального окна
const contentStyle = computed(() => {
  if (modalSize.value.height !== null) {
    return {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }
  return {}
})


// Функции для перетаскивания модального окна
const startDrag = (e) => {
  // Не начинаем перетаскивание, если клик по кнопке закрытия
  if (e.target.closest('.btn-close')) {
    return
  }
  
  if (!modalDialogRef.value) return
  
  isDragging.value = true
  const rect = modalDialogRef.value.getBoundingClientRect()
  dragStart.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

const onDrag = (e) => {
  if (!isDragging.value) return

  modalPosition.value = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Функции для изменения размера модального окна
const startResize = (e, direction) => {
  if (!modalDialogRef.value) return
  
  isResizing.value = true
  resizeDirection.value = direction
  const rect = modalDialogRef.value.getBoundingClientRect()
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: rect.width,
    height: rect.height,
    left: rect.left,
    top: rect.top
  }
  
  // Если размер еще не установлен, устанавливаем текущий
  if (modalSize.value.width === null) {
    modalSize.value.width = rect.width
  }
  if (modalSize.value.height === null) {
    modalSize.value.height = rect.height
  }
  
  // Если позиция еще не установлена, устанавливаем начальную
  if (modalPosition.value.x === null || modalPosition.value.y === null) {
    modalPosition.value = {
      x: rect.left,
      y: rect.top
    }
  }
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
  e.stopPropagation()
}

const onResize = (e) => {
  if (!isResizing.value) return
  
  const deltaX = e.clientX - resizeStart.value.x
  const deltaY = e.clientY - resizeStart.value.y
  const direction = resizeDirection.value
  
  let newWidth = resizeStart.value.width
  let newHeight = resizeStart.value.height
  let newLeft = modalPosition.value.x
  let newTop = modalPosition.value.y
  
  // Изменение ширины
  if (direction.includes('e')) {
    // Правый край
    newWidth = resizeStart.value.width + deltaX
  } else if (direction.includes('w')) {
    // Левый край
    newWidth = resizeStart.value.width - deltaX
    newLeft = resizeStart.value.left + deltaX
  }
  
  // Изменение высоты
  if (direction.includes('s')) {
    // Нижний край
    newHeight = resizeStart.value.height + deltaY
  } else if (direction.includes('n')) {
    // Верхний край
    newHeight = resizeStart.value.height - deltaY
    newTop = resizeStart.value.top + deltaY
  }
  
  // Минимальные размеры
  const minWidth = 500
  const minHeight = 400
  
  // Корректируем позицию и размер при изменении левого/верхнего края
  if (direction.includes('w')) {
    const widthDiff = newWidth - resizeStart.value.width
    if (newWidth < minWidth) {
      newWidth = minWidth
      newLeft = resizeStart.value.left + (resizeStart.value.width - minWidth)
    }
  }
  
  if (direction.includes('n')) {
    const heightDiff = newHeight - resizeStart.value.height
    if (newHeight < minHeight) {
      newHeight = minHeight
      newTop = resizeStart.value.top + (resizeStart.value.height - minHeight)
    }
  }
  
  modalSize.value = {
    width: Math.max(minWidth, newWidth),
    height: Math.max(minHeight, newHeight)
  }
  
  if (direction.includes('w') || direction.includes('n')) {
    modalPosition.value = {
      x: newLeft,
      y: newTop
    }
  }
  
  // Сохраняем размер
  saveSize()
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// Сохранение и загрузка размера
const saveSize = () => {
  localStorage.setItem('biChartsModalSize', JSON.stringify(modalSize.value))
}

const loadSize = () => {
  try {
    const savedSize = localStorage.getItem('biChartsModalSize')
    if (savedSize) {
      const size = JSON.parse(savedSize)
      if (size.width && size.height) {
        modalSize.value = {
          width: size.width,
          height: size.height
        }
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки размера:', error)
  }
}

// Обработка глобального drop (если файл перетащили на фон модального окна)
const handleGlobalDragOver = (e) => {
  // Разрешаем drop только если это файлы
  if (e.dataTransfer.types.includes('Files')) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
}

const handleGlobalDrop = (e) => {
  // Обработка drop на фон (если нужно)
}

// Сохранение состояния в localStorage
const saveState = () => {
  if (!props.fileId) return
  
  // Определяем, был ли построен график (если выбраны оба поля)
  const chartWasBuilt = canRenderChart.value && selectedXField.value && selectedYField.value
  
  const state = {
    fileId: props.fileId,
    chartType: chartType.value,
    selectedXField: selectedXField.value,
    selectedYField: selectedYField.value,
    hasChart: chartWasBuilt
  }
  localStorage.setItem(`biChartsModalState_${props.fileId}`, JSON.stringify(state))
}

// Восстановление состояния из localStorage
const loadState = () => {
  if (!props.fileId) return
  
  try {
    const savedState = localStorage.getItem(`biChartsModalState_${props.fileId}`)
    if (!savedState) return
    
    const state = JSON.parse(savedState)
    
    // Восстанавливаем состояние
    if (state.chartType && ['bar', 'line', 'pie', 'doughnut', 'area'].includes(state.chartType)) {
      chartType.value = state.chartType
    }
    if (state.selectedXField) {
      selectedXField.value = state.selectedXField
    }
    if (state.selectedYField) {
      selectedYField.value = state.selectedYField
    }
    if (state.hasChart !== undefined) {
      hasChart.value = state.hasChart
    }
  } catch (error) {
    console.error('Ошибка восстановления состояния графика:', error)
  }
}

// Очистка сохраненного состояния
const clearSavedState = () => {
  if (!props.fileId) return
  localStorage.removeItem(`biChartsModalState_${props.fileId}`)
}

// Загрузка данных из файла
const loadFileData = async () => {
  if (!props.fileId) {
    error.value = 'Файл не выбран'
    return
  }

  isLoading.value = true
  error.value = null
  columns.value = []
  data.value = []

  try {
    // Загружаем первые 1000 строк для построения графика
    const params = {
      limit: 1000,
      offset: 0,
      has_header: true,
    }
    
    const res = await apiClient.get(`${endpoints.bi.Upload}${props.fileId}/`, params)
    
    if (res.success && res.data?.parsed) {
      const parsed = res.data.parsed
      
      if (parsed.length === 0) {
        error.value = 'Файл пустой'
        return
      }

      // Первая строка - заголовки
      columns.value = parsed[0]
      
      // Остальные строки - данные
      const rows = parsed.slice(1)
      
      // Преобразуем в объекты для удобства работы
      data.value = rows.map(row => {
        const obj = {}
        columns.value.forEach((col, index) => {
          obj[col] = row[index]
        })
        return obj
      })

      // Загружаем сохраненное состояние после загрузки данных
      const savedState = localStorage.getItem(`biChartsModalState_${props.fileId}`)
      let hasValidState = false
      
      if (savedState) {
        try {
          const state = JSON.parse(savedState)
          // Проверяем, что сохраненные поля существуют в данных
          if (state.selectedXField && columns.value.includes(state.selectedXField) &&
              state.selectedYField && columns.value.includes(state.selectedYField)) {
            hasValidState = true
            // Восстанавливаем состояние
            if (state.chartType && ['bar', 'line', 'pie', 'doughnut', 'area'].includes(state.chartType)) {
              chartType.value = state.chartType
            }
            selectedXField.value = state.selectedXField
            selectedYField.value = state.selectedYField
            // Если график был построен, отмечаем это
            if (state.hasChart) {
              hasChart.value = true
            }
          }
        } catch (e) {
          console.error('Ошибка проверки состояния:', e)
        }
      }
      
      // Если нет валидного сохраненного состояния, выбираем первые поля автоматически
      if (!hasValidState) {
        if (columns.value.length >= 2) {
          selectedXField.value = columns.value[0]
          selectedYField.value = columns.value[1]
          hasChart.value = false
        } else if (columns.value.length === 1) {
          selectedXField.value = columns.value[0]
          hasChart.value = false
        }
      }
      
      // Сохраняем состояние после загрузки данных
      // Используем nextTick чтобы убедиться, что все реактивные значения обновлены
      await nextTick()
      saveState()
    } else {
      error.value = res.error || 'Не удалось загрузить данные из файла'
    }
  } catch (err) {
    console.error('Ошибка загрузки данных файла:', err)
    error.value = err.message || 'Ошибка загрузки данных'
  } finally {
    isLoading.value = false
  }
}

// Компонент графика в зависимости от типа
const chartComponent = computed(() => {
  switch (chartType.value) {
    case 'bar':
      return Bar
    case 'line':
    case 'area':
      return Line // Area использует Line с fill: true
    case 'pie':
      return Pie
    case 'doughnut':
      return Doughnut
    default:
      return Bar
  }
})

// Проверка возможности построения графика
const canRenderChart = computed(() => {
  return selectedXField.value && selectedYField.value && data.value.length > 0
})

// Подготовка данных для графика в формате Chart.js
const chartData = computed(() => {
  if (!canRenderChart.value || data.value.length === 0) {
    return { labels: [], datasets: [] }
  }

  // Для круговых диаграмм (pie, doughnut)
  if (chartType.value === 'pie' || chartType.value === 'doughnut') {
    // Группируем данные по X и суммируем Y
    const grouped = {}
    data.value.forEach(row => {
      const xValue = String(row[selectedXField.value] || '')
      const yValue = parseFloat(row[selectedYField.value]) || 0
      if (!grouped[xValue]) {
        grouped[xValue] = 0
      }
      grouped[xValue] += yValue
    })

    const labels = Object.keys(grouped)
    const values = Object.values(grouped)

    return {
      labels: labels,
      datasets: [
        {
          label: selectedYField.value,
          data: values,
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)',
            'rgba(83, 102, 255, 0.6)',
            'rgba(255, 99, 255, 0.6)',
            'rgba(99, 255, 132, 0.6)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
            'rgba(83, 102, 255, 1)',
            'rgba(255, 99, 255, 1)',
            'rgba(99, 255, 132, 1)',
          ],
          borderWidth: 1,
        },
      ],
    }
  }

  // Для столбчатых и линейных графиков
  // Группируем данные по X и суммируем Y (на случай дубликатов)
  const grouped = {}
  data.value.forEach(row => {
    const xValue = String(row[selectedXField.value] || '')
    const yValue = parseFloat(row[selectedYField.value]) || 0
    if (!grouped[xValue]) {
      grouped[xValue] = 0
    }
    grouped[xValue] += yValue
  })

  const labels = Object.keys(grouped)
  const values = Object.values(grouped)

  return {
    labels: labels,
    datasets: [
      {
        label: selectedYField.value,
        data: values,
        backgroundColor: chartType.value === 'bar' 
          ? 'rgba(54, 162, 235, 0.6)'
          : 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        fill: chartType.value === 'area',
      },
    ],
  }
})

// Опции графика для Chart.js
const chartOptions = computed(() => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        enabled: true,
      },
      title: {
        display: false,
      },
    },
  }

  // Для столбчатых и линейных графиков
  if (chartType.value === 'bar' || chartType.value === 'line' || chartType.value === 'area') {
    baseOptions.scales = {
      x: {
        title: {
          display: true,
          text: selectedXField.value || '',
        },
      },
      y: {
        title: {
          display: true,
          text: selectedYField.value || '',
        },
        beginAtZero: true,
      },
    }
  }

  return baseOptions
})

// Получение canvas элемента из графика
const getChartCanvas = () => {
  if (!chartRef.value) {
    return null
  }
  
  // Для vue-chartjs компонент имеет свойство chartInstance или chart
  let chartInstance = null
  if (chartRef.value.chartInstance) {
    chartInstance = chartRef.value.chartInstance
  } else if (chartRef.value.chart) {
    chartInstance = chartRef.value.chart
  } else if (chartRef.value.$data && chartRef.value.$data.chartInstance) {
    chartInstance = chartRef.value.$data.chartInstance
  }
  
  if (chartInstance && chartInstance.canvas) {
    return chartInstance.canvas
  }
  
  // Альтернативный способ: поиск canvas в DOM
  let wrapper = null
  if (chartRef.value.$el) {
    wrapper = chartRef.value.$el
  } else if (chartRef.value instanceof HTMLElement) {
    wrapper = chartRef.value
  } else if (chartRef.value.$ && chartRef.value.$.vnode && chartRef.value.$.vnode.el) {
    wrapper = chartRef.value.$.vnode.el
  }
  
  if (wrapper) {
    const canvas = wrapper.querySelector('canvas')
    if (canvas) {
      return canvas
    }
  }
  
  // Последняя попытка: поиск canvas в document
  const allCanvases = document.querySelectorAll('.chart-wrapper canvas')
  if (allCanvases.length > 0) {
    return allCanvases[allCanvases.length - 1]
  }
  
  return null
}

// Сохранение графика как PNG
const saveAsPNG = async () => {
  try {
    await nextTick()
    const canvas = getChartCanvas()
    
    if (!canvas) {
      toast.error('Не удалось получить график для сохранения')
      return
    }
    
    // Конвертируем canvas в blob
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Ошибка при создании изображения')
        return
      }
      
      // Создаем URL и скачиваем файл
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chart_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('График сохранен как PNG')
    }, 'image/png')
  } catch (error) {
    console.error('Ошибка сохранения PNG:', error)
    toast.error('Ошибка при сохранении графика')
  }
}

// Сохранение графика как JPEG
const saveAsJPEG = async () => {
  try {
    await nextTick()
    const canvas = getChartCanvas()
    
    if (!canvas) {
      toast.error('Не удалось получить график для сохранения')
      return
    }
    
    // Конвертируем canvas в blob с JPEG форматом
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Ошибка при создании изображения')
        return
      }
      
      // Создаем URL и скачиваем файл
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chart_${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('График сохранен как JPEG')
    }, 'image/jpeg', 0.95) // 0.95 - качество JPEG
  } catch (error) {
    console.error('Ошибка сохранения JPEG:', error)
    toast.error('Ошибка при сохранении графика')
  }
}

// Копирование графика в буфер обмена
const copyToClipboard = async () => {
  try {
    await nextTick()
    const canvas = getChartCanvas()
    
    if (!canvas) {
      toast.error('Не удалось получить график для копирования')
      return
    }
    
    // Конвертируем canvas в blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error('Ошибка при создании изображения')
        return
      }
      
      try {
        // Используем Clipboard API для копирования изображения
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ])
        
        toast.success('График скопирован в буфер обмена')
      } catch (clipboardError) {
        // Fallback: конвертируем в data URL и копируем как текст
        const dataURL = canvas.toDataURL('image/png')
        
        // Создаем временный элемент textarea для копирования
        const textarea = document.createElement('textarea')
        textarea.value = dataURL
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        
        try {
          document.execCommand('copy')
          toast.success('График скопирован в буфер обмена')
        } catch (execError) {
          toast.error('Не удалось скопировать график. Используйте кнопки сохранения.')
        } finally {
          document.body.removeChild(textarea)
        }
      }
    }, 'image/png')
  } catch (error) {
    console.error('Ошибка копирования:', error)
    toast.error('Ошибка при копировании графика')
  }
}

const handleClose = () => {
  if (!isLoading.value) {
    // Сохраняем состояние перед закрытием
    saveState()
    emit('close')
    // Сброс состояния (но не очищаем localStorage, чтобы можно было восстановить)
    setTimeout(() => {
      columns.value = []
      data.value = []
      error.value = null
      // Не сбрасываем chartType, selectedXField, selectedYField - они восстановятся из localStorage
    }, 300)
  }
}

const goBack = () => {
  if (!isLoading.value) {
    // Сохраняем состояние перед возвратом
    saveState()
    // Закрываем окно построения графиков
    emit('close')
    // Открываем окно BI анализа с восстановленным состоянием
    setTimeout(() => {
      biAnalysisService.open()
    }, 100)
  }
}

// Управление прокруткой страницы
const disableBodyScroll = () => {
  document.body.style.overflow = 'hidden'
}

const enableBodyScroll = () => {
  document.body.style.overflow = ''
}

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    // Загружаем размер при открытии
    loadSize()
    // Сбрасываем позицию при открытии, чтобы окно появлялось по центру
    modalPosition.value = { x: null, y: null }
    if (props.fileId) {
      // Загружаем базовое состояние (тип графика) ДО загрузки данных
      // Поля будут восстановлены после загрузки данных в loadFileData
      const savedState = localStorage.getItem(`biChartsModalState_${props.fileId}`)
      if (savedState) {
        try {
          const state = JSON.parse(savedState)
          if (state.chartType && ['bar', 'line', 'pie', 'doughnut', 'area'].includes(state.chartType)) {
            chartType.value = state.chartType
          }
        } catch (e) {
          console.error('Ошибка загрузки типа графика:', e)
        }
      }
      // Загружаем данные - там будет восстановление полей после загрузки колонок
      loadFileData()
    }
  } else {
    // Сохраняем состояние при закрытии
    saveState()
    // Сбрасываем позицию при закрытии
    modalPosition.value = { x: null, y: null }
    stopDrag()
    stopResize()
  }
})

// Сохраняем состояние при изменении настроек графика
watch([chartType, selectedXField, selectedYField], () => {
  if (props.show && props.fileId && !isLoading.value) {
    // Отмечаем, что график был построен, если все поля выбраны
    if (canRenderChart.value && selectedXField.value && selectedYField.value) {
      hasChart.value = true
    } else {
      hasChart.value = false
    }
    // Небольшая задержка, чтобы избежать множественных сохранений
    setTimeout(() => {
      saveState()
    }, 100)
  }
})

onMounted(() => {
  if (props.show && props.fileId) {
    disableBodyScroll()
    // Загружаем состояние перед загрузкой данных
    loadState()
    loadFileData()
  }
})

onUnmounted(() => {
  stopDrag()
})
</script>

<style scoped lang="scss">
.bi-charts-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: transparent; // Прозрачный фон
  z-index: 9999;
  pointer-events: none; // Фон не блокирует взаимодействие
  overflow: visible;
}

.modal-dialog {
  z-index: 10000;
  position: relative;
  pointer-events: auto; // Включаем события для самого диалога
  // Центрирование по умолчанию, если нет сохраненной позиции
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.modal-content {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  background-color: var(--bs-body-bg, #ffffff);
  opacity: 1;
  position: relative;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  z-index: 10;
  background-color: transparent;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(var(--bs-primary-rgb, 13, 110, 253), 0.2);
  }
  
  // Углы
  &-nw {
    top: 0;
    left: 0;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
  }
  
  &-ne {
    top: 0;
    right: 0;
    width: 20px;
    height: 20px;
    cursor: nesw-resize;
  }
  
  &-sw {
    bottom: 0;
    left: 0;
    width: 20px;
    height: 20px;
    cursor: nesw-resize;
  }
  
  &-se {
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
  }
  
  // Края
  &-n {
    top: 0;
    left: 20px;
    right: 20px;
    height: 10px;
    cursor: ns-resize;
  }
  
  &-s {
    bottom: 0;
    left: 20px;
    right: 20px;
    height: 10px;
    cursor: ns-resize;
  }
  
  &-w {
    left: 0;
    top: 20px;
    bottom: 20px;
    width: 10px;
    cursor: ew-resize;
  }
  
  &-e {
    right: 0;
    top: 20px;
    bottom: 20px;
    width: 10px;
    cursor: ew-resize;
  }
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #dee2e6;
  background-color: var(--bs-body-bg, #ffffff);
}

.modal-body {
  padding: 1.5rem;
  max-height: 80vh;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--bs-body-bg, #ffffff);
  flex: 1;
  min-height: 0;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #dee2e6;
  background-color: var(--bs-body-bg, #ffffff);
}

.chart-settings {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 0.5rem;
}

.chart-wrapper {
  min-height: 500px;
  height: 500px;
  padding: 1rem;
  background-color: white;
  border-radius: 0.5rem;
  border: 1px solid #dee2e6;
  position: relative;
}

@media (max-width: 768px) {
  .modal-body {
    max-height: 70vh;
  }
  
  .chart-wrapper {
    min-height: 400px;
  }
}
</style>

