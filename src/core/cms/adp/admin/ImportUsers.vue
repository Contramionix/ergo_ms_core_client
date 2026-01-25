<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-vue-next'
import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'

const router = useRouter()
const toast = useToast()

const fileInput = ref(null)
const selectedFile = ref(null)
const isImporting = ref(false)
const importResults = ref(null)
const importLogs = ref([])
const importProgress = ref(0)
const importStatus = ref('')
const hasAdminAccess = ref(false)
const isCheckingAccess = ref(true)

const progressPercent = computed(() => {
  return Math.min(100, Math.max(0, importProgress.value))
})

onMounted(async () => {
  try {
    const accessData = await CheckAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      router.push({ name: 'AccessDenied' })
      return
    }
    hasAdminAccess.value = true
  } catch (error) {
    console.error('Ошибка проверки прав доступа:', error)
    toast.error('Ошибка проверки прав доступа')
    router.push({ name: 'AccessDenied' })
  } finally {
    isCheckingAccess.value = false
  }
})

const goBack = () => {
  router.push({ name: 'UsersPanel' })
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    const allowedExtensions = ['.xlsx', '.xls', '.csv']
    
    const hasValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    
    if (!hasValidExtension && !allowedTypes.includes(file.type)) {
      toast.error('Поддерживаются только файлы Excel (.xlsx, .xls) и CSV (.csv)')
      return
    }
    
    selectedFile.value = file
    importResults.value = null
    importLogs.value = []
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

const handleDrop = (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (file) {
    const allowedExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    
    if (!hasValidExtension) {
      toast.error('Поддерживаются только файлы Excel (.xlsx, .xls) и CSV (.csv)')
      return
    }
    
    selectedFile.value = file
    importResults.value = null
    importLogs.value = []
  }
}

const removeFile = () => {
  selectedFile.value = null
  importResults.value = null
  importLogs.value = []
  importProgress.value = 0
  importStatus.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const startImport = async () => {
  if (!selectedFile.value) {
    toast.warning('Выберите файл для импорта')
    return
  }
  
  isImporting.value = true
  importLogs.value = []
  importResults.value = null
  importProgress.value = 0
  importStatus.value = 'Загрузка файла...'
  
  // Имитация прогресса во время отправки
  const progressInterval = setInterval(() => {
    if (importProgress.value < 90) {
      importProgress.value += Math.random() * 10
      if (importProgress.value > 30 && importProgress.value < 60) {
        importStatus.value = 'Обработка данных...'
      } else if (importProgress.value >= 60) {
        importStatus.value = 'Создание пользователей...'
      }
    }
  }, 300)
  
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    
    const response = await apiClient.post(cmsEndpoints.cms.importUsers, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    clearInterval(progressInterval)
    importProgress.value = 100
    importStatus.value = 'Импорт завершён!'
    
    importResults.value = {
      success: true,
      created: response.data.created || 0,
      skipped: response.data.skipped || 0,
      total: response.data.total || 0,
      errors: response.data.errors || []
    }
    importLogs.value = response.data.logs || []
    
    if (response.data.created > 0) {
      toast.success(`Импортировано ${response.data.created} пользователей`)
    } else {
      toast.info('Новых пользователей не создано')
    }
  } catch (error) {
    clearInterval(progressInterval)
    importProgress.value = 100
    importStatus.value = 'Ошибка импорта'
    
    const errorData = error.response?.data || {}
    importResults.value = {
      success: false,
      created: errorData.created || 0,
      skipped: errorData.skipped || 0,
      total: errorData.total || 0,
      errors: errorData.errors || [errorData.error || 'Произошла ошибка при импорте']
    }
    importLogs.value = errorData.logs || []
    toast.error(errorData.error || 'Ошибка при импорте пользователей')
  } finally {
    isImporting.value = false
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getLogIcon = (level) => {
  switch (level) {
    case 'success': return CheckCircle
    case 'error': return XCircle
    case 'warn': return AlertCircle
    default: return null
  }
}

const getLogClass = (level) => {
  switch (level) {
    case 'success': return 'text-success'
    case 'error': return 'text-danger'
    case 'warn': return 'text-warning'
    default: return 'text-secondary'
  }
}
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
    <Loader2 :size="48" class="text-primary spinner" />
  </div>
  
  <div v-else-if="hasAdminAccess" class="card">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-center gap-3 mb-4">
        <button
          type="button"
          class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
          @click="goBack"
        >
          <ArrowLeft :size="18" class="flex-shrink-0" />
          <span>К панели пользователей</span>
        </button>
      </div>
      
      <h5 class="mb-3">Импорт пользователей</h5>
      
      <!-- Информация о формате файла -->
      <div class="alert alert-info mb-4">
        <strong>Требования к файлу:</strong>
        <ul class="mb-0 mt-2">
          <li>Формат: Excel (.xlsx, .xls) или CSV (.csv)</li>
          <li>Обязательные столбцы: <code>Фамилия</code>, <code>Имя</code>, <code>Логин</code></li>
          <li>Опциональные столбцы: <code>Отчество</code>, <code>E-mail</code></li>
          <li>Пароль по умолчанию для всех создаваемых пользователей: <code>1</code></li>
          <li>Пользователи с совпадающими ФИО будут пропущены</li>
        </ul>
      </div>
      
      <!-- Зона загрузки файла -->
      <div
        class="upload-zone mb-4"
        :class="{ 'has-file': selectedFile }"
        @click="triggerFileInput"
        @dragover="handleDragOver"
        @drop="handleDrop"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="d-none"
          @change="handleFileSelect"
        />
        
        <template v-if="!selectedFile">
          <Upload :size="48" class="text-muted mb-3" />
          <p class="mb-2">Перетащите файл сюда или нажмите для выбора</p>
          <p class="text-muted small mb-0">Поддерживаются Excel (.xlsx, .xls) и CSV (.csv)</p>
        </template>
        
        <template v-else>
          <div class="d-flex align-items-center gap-3">
            <FileSpreadsheet :size="40" class="text-success flex-shrink-0" />
            <div class="flex-grow-1 text-start">
              <p class="mb-0 fw-medium">{{ selectedFile.name }}</p>
              <p class="mb-0 text-muted small">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
            <button
              type="button"
              class="btn btn-outline-danger btn-sm"
              @click.stop="removeFile"
            >
              <XCircle :size="18" />
            </button>
          </div>
        </template>
      </div>
      
      <!-- Кнопка импорта -->
      <div class="mb-4">
        <button
          type="button"
          class="btn btn-primary d-inline-flex align-items-center gap-2"
          :disabled="!selectedFile || isImporting"
          @click="startImport"
        >
          <Loader2 v-if="isImporting" :size="18" class="spinner" />
          <Upload v-else :size="18" />
          <span>{{ isImporting ? 'Импортирование...' : 'Начать импорт' }}</span>
        </button>
      </div>
      
      <!-- Прогресс-бар -->
      <div v-if="isImporting || importResults" class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-muted small">{{ importStatus }}</span>
          <span class="text-muted small fw-medium">{{ Math.round(progressPercent) }}%</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div
            class="progress-bar"
            :class="{
              'bg-primary': isImporting,
              'bg-success': importResults?.success,
              'bg-danger': importResults && !importResults.success,
              'progress-bar-striped progress-bar-animated': isImporting
            }"
            role="progressbar"
            :style="{ width: progressPercent + '%' }"
            :aria-valuenow="progressPercent"
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        <div v-if="importResults" class="mt-2 small text-muted">
          Обработано строк: {{ importResults.total || 0 }} | 
          Создано: {{ importResults.created }} | 
          Пропущено: {{ importResults.skipped }}
        </div>
      </div>
      
      <!-- Результаты импорта -->
      <div v-if="importResults" class="mb-4">
        <div
          class="alert"
          :class="importResults.success ? 'alert-success' : 'alert-danger'"
        >
          <div class="d-flex align-items-center gap-2 mb-2">
            <CheckCircle v-if="importResults.success" :size="20" />
            <XCircle v-else :size="20" />
            <strong>{{ importResults.success ? 'Импорт завершён' : 'Ошибка импорта' }}</strong>
          </div>
          <ul class="mb-0">
            <li>Создано пользователей: <strong>{{ importResults.created }}</strong></li>
            <li>Пропущено (дубликаты или ошибки): <strong>{{ importResults.skipped }}</strong></li>
            <li v-if="importResults.errors.length > 0">
              Ошибок: <strong>{{ importResults.errors.length }}</strong>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- Логи импорта -->
      <div v-if="importLogs.length > 0" class="import-logs">
        <h6 class="mb-3">Журнал импорта</h6>
        <div class="logs-container">
          <div
            v-for="(log, index) in importLogs"
            :key="index"
            class="log-entry d-flex align-items-start gap-2"
            :class="getLogClass(log.level)"
          >
            <component
              :is="getLogIcon(log.level)"
              v-if="getLogIcon(log.level)"
              :size="16"
              class="flex-shrink-0 mt-1"
            />
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.upload-zone {
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #0d6efd;
    background-color: rgba(13, 110, 253, 0.05);
  }
  
  &.has-file {
    border-style: solid;
    border-color: #198754;
    background-color: rgba(25, 135, 84, 0.05);
    cursor: default;
  }
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.import-logs {
  .logs-container {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1rem;
    background-color: #f8f9fa;
  }
  
  .log-entry {
    padding: 0.25rem 0;
    font-size: 0.875rem;
    font-family: monospace;
    
    &:not(:last-child) {
      border-bottom: 1px solid #e9ecef;
    }
  }
  
  .log-message {
    word-break: break-word;
  }
}

@media (max-width: 576px) {
  .upload-zone {
    padding: 1.5rem;
  }
}
</style>
