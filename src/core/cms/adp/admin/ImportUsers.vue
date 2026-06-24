<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-vue-next'
import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
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
const skipWelcomeEmails = ref(false)
const logsContainer = ref(null)  // Для автопрокрутки

const STORAGE_KEY_TASK_ID = 'cms_import_users_task_id'
const savedTaskId = ref(null)

// Для очистки polling при unmount
let pollTimeoutId = null
let importTimeoutId = null

// Статистика для прогресса
const currentStats = ref({
  total: 0,
  processed: 0,
  created: 0,
  skipped: 0
})

const progressPercent = computed(() => {
  return Math.min(100, Math.max(0, importProgress.value))
})

const clearStorageTaskId = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY_TASK_ID)
  } catch (_) {}
  savedTaskId.value = null
}

onMounted(async () => {
  try {
    const accessData = await CheckAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      router.push({ name: 'AccessDenied' })
      return
    }
    hasAdminAccess.value = true
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_TASK_ID)
      if (stored) savedTaskId.value = stored
    } catch (_) {}
  } catch (error) {
    console.error('Ошибка проверки прав доступа:', error)
    toast.error('Ошибка проверки прав доступа')
    router.push({ name: 'AccessDenied' })
  } finally {
    isCheckingAccess.value = false
  }
})

onBeforeUnmount(() => {
  // Очищаем таймауты при уничтожении компонента
  stopPolling()
})

const goBack = () => {
  router.push({ name: 'UsersPanel' })
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

// Вспомогательные функции для устранения дублирования
const isValidFileExtension = (fileName) => {
  const allowedExtensions = ['.xlsx', '.xls', '.csv']
  return allowedExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
}

const resetImportState = () => {
  importResults.value = null
  importLogs.value = []
  importProgress.value = 0
  importStatus.value = ''
  currentStats.value = { total: 0, processed: 0, created: 0, skipped: 0 }
}

const stopPolling = () => {
  if (pollTimeoutId) {
    clearTimeout(pollTimeoutId)
    pollTimeoutId = null
  }
  if (importTimeoutId) {
    clearTimeout(importTimeoutId)
    importTimeoutId = null
  }
}

const filterDuplicateLogs = (newLogs) => {
  return newLogs.filter(newLog => {
    return !importLogs.value.some(existingLog => 
      existingLog.level === newLog.level && 
      existingLog.message === newLog.message
    )
  })
}

const getAdaptivePollInterval = (progress) => {
  if (progress < 10) return 300  // Первые 10% - быстро
  if (progress < 50) return 500  // 10-50% - средне
  if (progress < 90) return 800  // 50-90% - медленнее
  return 500  // Последние 10% - снова быстрее (финал)
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (!isValidFileExtension(file.name)) {
      toast.error('Поддерживаются только файлы Excel (.xlsx, .xls) и CSV (.csv)')
      return
    }
    
    selectedFile.value = file
    resetImportState()
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
    if (!isValidFileExtension(file.name)) {
      toast.error('Поддерживаются только файлы Excel (.xlsx, .xls) и CSV (.csv)')
      return
    }
    
    selectedFile.value = file
    resetImportState()
  }
}

// Автопрокрутка логов вниз
const scrollLogsToBottom = async () => {
  await nextTick()
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight
  }
}

const removeFile = () => {
  selectedFile.value = null
  resetImportState()
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const POLL_TIMEOUT_MS = 1800000

function runPolling(taskId) {
  let lastLogIndex = 0

  const pollTaskStatus = async () => {
    if (!isImporting.value) return

    try {
      const statusResponse = await apiClient.get(
        cmsEndpoints.cms.importUsersTaskStatus(taskId),
        { params: { last_log_index: lastLogIndex } }
      )
      const taskStatus = statusResponse.data

      if (taskStatus.state === 'PROGRESS') {
        currentStats.value = {
          total: taskStatus.total || 0,
          processed: taskStatus.current || 0,
          created: taskStatus.created || 0,
          skipped: taskStatus.skipped || 0
        }
        importProgress.value = taskStatus.progress || 0
        importStatus.value = `Обработка: ${taskStatus.current}/${taskStatus.total}`

        if (taskStatus.new_logs && taskStatus.new_logs.length > 0) {
          const uniqueNewLogs = filterDuplicateLogs(taskStatus.new_logs)
          if (uniqueNewLogs.length > 0) {
            importLogs.value.push(...uniqueNewLogs)
            lastLogIndex += taskStatus.new_logs.length
            scrollLogsToBottom()
          }
        }

        const progress = taskStatus.progress || 0
        pollTimeoutId = setTimeout(pollTaskStatus, getAdaptivePollInterval(progress))
      } else if (taskStatus.state === 'SUCCESS') {
        const result = taskStatus.result || {}
        currentStats.value = {
          total: result.total || 0,
          processed: result.total || 0,
          created: result.created || 0,
          skipped: result.skipped || 0
        }
        importProgress.value = 100
        importStatus.value = 'Импорт завершён!'
        importResults.value = {
          success: result.success !== false,
          created: result.created || 0,
          skipped: result.skipped || 0,
          total: result.total || 0,
          errors: result.errors || []
        }
        if (result.logs && result.logs.length > 0) {
          const uniqueNewLogs = filterDuplicateLogs(result.logs)
          if (uniqueNewLogs.length > 0) {
            importLogs.value.push(...uniqueNewLogs)
            scrollLogsToBottom()
          }
        }
        if (result.created > 0) {
          toast.success(`Импортировано ${result.created} пользователей`)
        } else {
          toast.info('Новых пользователей не создано')
        }
        clearStorageTaskId()
        stopPolling()
        isImporting.value = false
      } else if (taskStatus.state === 'FAILURE') {
        importProgress.value = 100
        importStatus.value = 'Ошибка импорта'
        importResults.value = {
          success: false,
          created: 0,
          skipped: 0,
          total: 0,
          errors: [taskStatus.error || 'Произошла ошибка при импорте']
        }
        toast.error(taskStatus.error || 'Ошибка при импорте пользователей')
        clearStorageTaskId()
        stopPolling()
        isImporting.value = false
      } else {
        pollTimeoutId = setTimeout(pollTaskStatus, 500)
      }
    } catch (pollError) {
      console.error('Ошибка при получении статуса задачи:', pollError)
      pollTimeoutId = setTimeout(pollTaskStatus, 1000)
    }
  }

  pollTimeoutId = setTimeout(pollTaskStatus, 300)
  importTimeoutId = setTimeout(() => {
    if (isImporting.value) {
      stopPolling()
      isImporting.value = false
      toast.warning(
        'Импорт ещё выполняется. Вы можете уйти со страницы и вернуться позже — нажмите «Продолжить отслеживание», чтобы снова увидеть прогресс.'
      )
    }
  }, POLL_TIMEOUT_MS)
}

const resumeImport = () => {
  const taskId = savedTaskId.value
  if (!taskId) return
  isImporting.value = true
  resetImportState()
  importStatus.value = 'Восстановление отслеживания...'
  runPolling(taskId)
}

const startImport = async () => {
  if (!selectedFile.value) {
    toast.warning('Выберите файл для импорта')
    return
  }
  
  isImporting.value = true
  resetImportState()
  importStatus.value = 'Запуск импорта...'
  
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('skip_welcome_emails', skipWelcomeEmails.value.toString())
    
    // Запускаем Celery задачу
    const response = await apiClient.post(cmsEndpoints.cms.importUsers, formData)
    
    if (!response.data || !response.data.task_id) {
      throw new Error('Не получен task_id от сервера')
    }
    
    const taskId = response.data.task_id
    try {
      sessionStorage.setItem(STORAGE_KEY_TASK_ID, taskId)
    } catch (_) {}
    savedTaskId.value = taskId
    importStatus.value = 'Обработка файла...'
    
    runPolling(taskId)
    
  } catch (error) {
    importProgress.value = 100
    importStatus.value = 'Ошибка импорта'
    
    const errorData = error.response?.data || {}
    
    importResults.value = {
      success: false,
      created: 0,
      skipped: 0,
      total: 0,
      errors: [errorData.error || 'Произошла ошибка при импорте']
    }
    
    toast.error(errorData.error || 'Ошибка при запуске импорта')
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
    case 'info': return AlertCircle
    default: return null
  }
}

const getLogClass = (level) => {
  switch (level) {
    case 'success': return 'text-success'
    case 'error': return 'text-danger'
    case 'warn': return 'text-warning'
    case 'info': return 'text-info'
    default: return 'text-secondary'
  }
}
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
      <SpinnerLoading color="primary" />
    </div>
    <div v-else-if="hasAdminAccess" class="card">
      <div class="card-body">
        <nav class="breadcrumb-nav mb-4" aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item"><a href="#" @click.prevent="goBack">Пользователи</a></li>
            <li class="breadcrumb-item active" aria-current="page">Импорт</li>
          </ol>
        </nav>
      <div v-if="savedTaskId && !isImporting && !importResults" class="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <span>Есть незавершённый импорт. Вы можете продолжить отслеживание.</span>
        <button type="button" class="btn btn-warning btn-sm" @click="resumeImport">Продолжить отслеживание</button>
      </div>
      <h5 class="mb-3">Импорт пользователей</h5>
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
      <div class="upload-zone mb-4" :class="{ 'has-file': selectedFile }" @click="triggerFileInput" @dragover="handleDragOver" @drop="handleDrop">
        <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="handleFileSelect"/>
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
            <button type="button" class="btn btn-outline-danger btn-sm" @click.stop="removeFile"><XCircle :size="18" /></button>
          </div>
        </template>
      </div>
      
      <div class="mb-4">
        <div class="form-check mb-3">
          <input id="skipWelcomeEmails" v-model="skipWelcomeEmails" type="checkbox" class="form-check-input" :disabled="isImporting"/>
          <label class="form-check-label" for="skipWelcomeEmails">Не отправлять приветственные письма на электронную почту</label>
          <div class="form-text text-muted">При включении этой опции пользователям не будут отправлены письма об успешной регистрации</div>
        </div>
        
        <button type="button" class="btn btn-primary d-inline-flex align-items-center gap-2" :disabled="!selectedFile || isImporting" @click="startImport">
          <Loader2 v-if="isImporting" :size="18" class="spinner" />
          <Upload v-else :size="18" />
          <span>{{ isImporting ? 'Импортирование...' : 'Начать импорт' }}</span>
        </button>
      </div>
      
      <div v-if="isImporting || importResults" class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-muted small">{{ importStatus }}</span>
          <span class="text-muted small fw-medium">{{ Math.round(progressPercent) }}%</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar" :class="{
              'bg-primary': isImporting,
              'bg-success': importResults?.success,
              'bg-danger': importResults && !importResults.success,
              'progress-bar-striped progress-bar-animated': isImporting
            }" role="progressbar" :style="{ width: progressPercent + '%' }" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        
        <div class="mt-3 row g-2">
          <div class="col-6 col-md-3">
            <div class="stats-card text-center p-2 rounded border">
              <div class="stats-value text-primary fw-bold">{{ currentStats.total || importResults?.total || 0 }}</div>
              <div class="stats-label text-muted small">Всего строк</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stats-card text-center p-2 rounded border">
              <div class="stats-value text-info fw-bold">{{ currentStats.processed || importResults?.total || 0 }}</div>
              <div class="stats-label text-muted small">Обработано</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stats-card text-center p-2 rounded border">
              <div class="stats-value text-success fw-bold">{{ currentStats.created || importResults?.created || 0 }}</div>
              <div class="stats-label text-muted small">Создано</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stats-card text-center p-2 rounded border">
              <div class="stats-value text-warning fw-bold">{{ currentStats.skipped || importResults?.skipped || 0 }}</div>
              <div class="stats-label text-muted small">Пропущено</div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="importResults" class="mb-4">
        <div class="alert" :class="importResults.success ? 'alert-success' : 'alert-danger'">
          <div class="d-flex align-items-center gap-2 mb-2">
            <CheckCircle v-if="importResults.success" :size="20" />
            <XCircle v-else :size="20" />
            <strong>{{ importResults.success ? 'Импорт завершён' : 'Ошибка импорта' }}</strong>
          </div>
          <ul class="mb-0">
            <li>Создано пользователей: <strong>{{ importResults.created }}</strong></li>
            <li>Пропущено (дубликаты или ошибки): <strong>{{ importResults.skipped }}</strong></li>
            <li v-if="importResults.errors.length > 0">Ошибок: <strong>{{ importResults.errors.length }}</strong></li>
          </ul>
        </div>
      </div>
      
      <div v-if="importLogs.length > 0" class="import-logs">
        <h6 class="mb-3">Журнал импорта</h6>
        <div class="logs-container" ref="logsContainer">
          <div v-for="(log, index) in importLogs" :key="index" class="log-entry d-flex align-items-start gap-2" :class="getLogClass(log.level)">
            <component :is="getLogIcon(log.level)" v-if="getLogIcon(log.level)" :size="16" class="flex-shrink-0 mt-1"/>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
</template>

<style scoped lang="scss">
.loading-container {
  min-height: 400px;
}

.breadcrumb-nav {
  .breadcrumb {
    font-size: 0.875rem;
  }

  .breadcrumb-item a {
    color: var(--color-accent);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .breadcrumb-item.active {
    color: var(--color-secondary-text);
  }
}

.upload-zone {
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-accent);
    background-color: var(--color-hover-background);
  }

  &.has-file {
    border-style: solid;
    border-color: var(--bs-success, #198754);
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
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 1rem;
    background-color: var(--color-secondary-background);
  }

  .log-entry {
    padding: 0.25rem 0;
    font-size: 0.875rem;
    font-family: monospace;

    &:not(:last-child) {
      border-bottom: 1px solid var(--color-border);
    }
  }

  .log-message {
    word-break: break-word;
  }
}

.stats-card {
  background-color: var(--color-secondary-background);
  transition: all 0.2s ease;

  .stats-value {
    font-size: 1.25rem;
    line-height: 1.2;
  }

  .stats-label {
    font-size: 0.75rem;
  }
}

@media (max-width: 576px) {
  .upload-zone {
    padding: 1.5rem;
  }

  .stats-card .stats-value {
    font-size: 1rem;
  }
}
</style>
