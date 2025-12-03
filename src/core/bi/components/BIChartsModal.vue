<template>
  <div 
    v-if="show" 
    class="bi-charts-modal fade show d-block" 
    tabindex="-1"
    @click.self="handleClose"
  >
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content">
        <div class="modal-header">
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
              <ApexCharts
                :type="chartType"
                :height="500"
                :width="'100%'"
                :options="chartOptions"
                :series="chartSeries"
              />
            </div>

            <div v-else class="alert alert-info">
              Выберите поля для построения графика.
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button 
            type="button" 
            class="btn btn-secondary" 
            @click="handleClose"
            :disabled="isLoading"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { BarChart3 } from 'lucide-vue-next'
import ApexCharts from 'vue3-apexcharts'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { getApexSeries, getApexColors } from '@/core/bi/Charts/components/js/apexDataTransform.js'

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

const isLoading = ref(false)
const error = ref(null)
const columns = ref([])
const data = ref([])
const chartType = ref('bar')
const selectedXField = ref('')
const selectedYField = ref('')

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

      // Автоматически выбираем первые два поля
      if (columns.value.length >= 2) {
        selectedXField.value = columns.value[0]
        selectedYField.value = columns.value[1]
      } else if (columns.value.length === 1) {
        selectedXField.value = columns.value[0]
      }
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

// Проверка возможности построения графика
const canRenderChart = computed(() => {
  if (chartType.value === 'pie') {
    return selectedXField.value && selectedYField.value
  }
  return selectedXField.value && selectedYField.value
})

// Подготовка данных для графика
const chartSeries = computed(() => {
  if (!canRenderChart.value || data.value.length === 0) {
    return []
  }

  // Для pie/donut используем специальную функцию
  if (chartType.value === 'pie' || chartType.value === 'donut') {
    const fields = {
      x: selectedXField.value ? [{ name: selectedXField.value, label: selectedXField.value }] : [],
      y: selectedYField.value ? [{ name: selectedYField.value, label: selectedYField.value }] : [],
    }
    
    return getApexSeries({
      type: chartType.value,
      fields: {
        x: fields.x,
        category: fields.x,
        indicators: fields.y,
      },
      dataset: data.value,
    })
  }

  // Для остальных типов графиков
  const fields = {
    x: selectedXField.value ? [{ name: selectedXField.value, label: selectedXField.value }] : [],
    y: selectedYField.value ? [{ name: selectedYField.value, label: selectedYField.value }] : [],
  }

  return getApexSeries({
    type: chartType.value,
    fields: fields,
    dataset: data.value,
  })
})

// Опции графика
const chartOptions = computed(() => {
  const baseOptions = {
    chart: {
      id: 'bi-chart',
      type: chartType.value,
      animations: { easing: 'easeinout' },
      toolbar: { show: true },
    },
    legend: { position: 'bottom' },
    dataLabels: { enabled: chartType.value === 'pie' || chartType.value === 'donut' },
    tooltip: { theme: 'light' },
    colors: getApexColors({
      type: chartType.value,
      fields: {
        x: selectedXField.value ? [{ name: selectedXField.value }] : [],
        y: selectedYField.value ? [{ name: selectedYField.value }] : [],
      },
      dataset: data.value,
    }),
  }

  if (chartType.value === 'bar' || chartType.value === 'line' || chartType.value === 'area') {
    if (selectedXField.value) {
      baseOptions.xaxis = {
        categories: [...new Set(data.value.map(r => String(r[selectedXField.value])))],
        title: { text: selectedXField.value },
      }
    }
    if (selectedYField.value) {
      baseOptions.yaxis = {
        title: { text: selectedYField.value },
        decimalsInFloat: 2,
      }
    }
  }

  if (chartType.value === 'pie' || chartType.value === 'donut') {
    if (selectedXField.value) {
      // Уникальные категории из данных
      baseOptions.labels = [...new Set(data.value.map(r => String(r[selectedXField.value] || '')))]
    }
  }

  return baseOptions
})

const handleClose = () => {
  if (!isLoading.value) {
    emit('close')
    // Сброс состояния
    setTimeout(() => {
      columns.value = []
      data.value = []
      selectedXField.value = ''
      selectedYField.value = ''
      chartType.value = 'bar'
      error.value = null
    }, 300)
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
    disableBodyScroll()
    if (props.fileId) {
      loadFileData()
    }
  } else {
    enableBodyScroll()
  }
})

onMounted(() => {
  if (props.show && props.fileId) {
    disableBodyScroll()
    loadFileData()
  }
})

onUnmounted(() => {
  enableBodyScroll()
})
</script>

<style scoped lang="scss">
.bi-charts-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-dialog {
  z-index: 10001;
  position: relative;
}

.modal-content {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  background-color: var(--bs-body-bg, #ffffff);
  opacity: 1;
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
  background-color: var(--bs-body-bg, #ffffff);
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
  padding: 1rem;
  background-color: white;
  border-radius: 0.5rem;
  border: 1px solid #dee2e6;
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

