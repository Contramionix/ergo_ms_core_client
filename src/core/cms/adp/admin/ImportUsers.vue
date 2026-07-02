<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/js/utils/toast.js'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, ArrowLeft, Download } from 'lucide-vue-next'
import { apiClient } from '@/js/api/manager'
import { logError } from '@/js/utils/logError.js'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { cmsEndpoints } from '@/core/cms/js/endpoints'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { downloadImportUsersTemplate } from '@/core/cms/adp/admin/js/importUsersExcel.js'
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
const sendWelcomeEmails = ref(false)
const welcomeEmailSubject = ref('')
const welcomeEmailBody = ref('')
const welcomePlaceholders = ref([])
const logsContainer = ref(null)  // Для автопрокрутки
const completedTaskId = ref(null)
const passwordsAvailable = ref(false)
const passwordsDownloaded = ref(false)
const downloadingPasswords = ref(false)
const downloadingTemplate = ref(false)

const STORAGE_KEY_TASK_ID = 'cms_import_users_task_id'
const STORAGE_KEY_PASSWORDS_TASK_ID = 'cms_import_users_passwords_task_id'
const STORAGE_KEY_PASSWORDS_DOWNLOADED = 'cms_import_users_passwords_downloaded'
const STORAGE_KEY_WELCOME_EMAIL = 'cms_import_users_welcome_email'
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

const canDownloadPasswords = computed(() =>
  Boolean(importResults.value?.success)
  && (importResults.value?.created || 0) > 0
  && passwordsAvailable.value
  && !passwordsDownloaded.value
  && Boolean(completedTaskId.value),
)

const clearStorageTaskId = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY_TASK_ID)
  } catch (_) {}
  savedTaskId.value = null
}

const clearPasswordsTaskStorage = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY_PASSWORDS_TASK_ID)
  } catch (_) {}
}

const markPasswordsDownloaded = (taskId) => {
  passwordsDownloaded.value = true
  passwordsAvailable.value = false
  try {
    sessionStorage.setItem(STORAGE_KEY_PASSWORDS_DOWNLOADED, taskId)
  } catch (_) {}
  clearPasswordsTaskStorage()
}

const isPasswordsDownloadedForTask = (taskId) => {
  try {
    return sessionStorage.getItem(STORAGE_KEY_PASSWORDS_DOWNLOADED) === taskId
  } catch (_) {
    return false
  }
}

const storePasswordsTaskId = (taskId) => {
  try {
    sessionStorage.setItem(STORAGE_KEY_PASSWORDS_TASK_ID, taskId)
  } catch (_) {}
}

const persistWelcomeEmailSettings = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY_WELCOME_EMAIL, JSON.stringify({
      sendWelcomeEmails: sendWelcomeEmails.value,
      subject: welcomeEmailSubject.value,
      body: welcomeEmailBody.value,
    }))
  } catch (_) {}
}

const restoreWelcomeEmailSettings = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_WELCOME_EMAIL)
    if (!raw) return
    const stored = JSON.parse(raw)
    if (typeof stored.sendWelcomeEmails === 'boolean') {
      sendWelcomeEmails.value = stored.sendWelcomeEmails
    }
    if (typeof stored.subject === 'string' && stored.subject) {
      welcomeEmailSubject.value = stored.subject
    }
    if (typeof stored.body === 'string' && stored.body) {
      welcomeEmailBody.value = stored.body
    }
  } catch (_) {}
}

const loadWelcomeEmailDefaults = async () => {
  try {
    const response = await apiClient.get(cmsEndpoints.cms.importUsersWelcomeEmailDefaults)
    const data = response.data || {}
    welcomePlaceholders.value = Array.isArray(data.placeholders) ? data.placeholders : []
    if (!welcomeEmailSubject.value) {
      welcomeEmailSubject.value = data.subject || ''
    }
    if (!welcomeEmailBody.value) {
      welcomeEmailBody.value = data.body || ''
    }
  } catch (error) {
    logError('Ошибка загрузки шаблона приветственного письма', error)
  }
}

const resetWelcomeEmailTemplate = async () => {
  try {
    const response = await apiClient.get(cmsEndpoints.cms.importUsersWelcomeEmailDefaults)
    const data = response.data || {}
    welcomeEmailSubject.value = data.subject || ''
    welcomeEmailBody.value = data.body || ''
    welcomePlaceholders.value = Array.isArray(data.placeholders) ? data.placeholders : []
    persistWelcomeEmailSettings()
  } catch (error) {
    logError('Ошибка сброса шаблона приветственного письма', error)
    toast.error('Не удалось загрузить шаблон по умолчанию')
  }
}

const restorePasswordsDownloadState = async () => {
  let taskId = null
  try {
    taskId = sessionStorage.getItem(STORAGE_KEY_PASSWORDS_TASK_ID)
  } catch (_) {}

  if (!taskId) return

  try {
    const statusResponse = await apiClient.get(
      cmsEndpoints.cms.importUsersTaskStatus(taskId),
    )
    const taskStatus = statusResponse.data
    if (taskStatus.state !== 'SUCCESS') {
      clearPasswordsTaskStorage()
      return
    }
    if (isPasswordsDownloadedForTask(taskId)) {
      passwordsDownloaded.value = true
      passwordsAvailable.value = false
      return
    }
    if (!taskStatus.passwords_available) {
      clearPasswordsTaskStorage()
      return
    }

    const result = taskStatus.result || {}
    completedTaskId.value = taskId
    passwordsAvailable.value = true
    passwordsDownloaded.value = false
    importResults.value = {
      success: result.success !== false,
      created: result.created || 0,
      skipped: result.skipped || 0,
      total: result.total || 0,
      errors: result.errors || [],
    }
    currentStats.value = {
      total: result.total || 0,
      processed: result.total || 0,
      created: result.created || 0,
      skipped: result.skipped || 0,
    }
    importProgress.value = 100
    importStatus.value = 'Загрузка завершена'
  } catch (error) {
    logError('Ошибка восстановления выгрузки паролей', error)
    clearPasswordsTaskStorage()
  }
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
    restoreWelcomeEmailSettings()
    await loadWelcomeEmailDefaults()
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_TASK_ID)
      if (stored) savedTaskId.value = stored
    } catch (_) {}
    await restorePasswordsDownloadState()
  } catch (error) {
    logError('Ошибка проверки прав доступа:', error)
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

const handleDownloadTemplate = async () => {
  if (downloadingTemplate.value || isImporting.value) {
    return
  }

  downloadingTemplate.value = true
  try {
    await downloadImportUsersTemplate()
  } catch (error) {
    logError('Ошибка формирования шаблона загрузки пользователей', error)
    toast.error('Не удалось сформировать шаблон')
  } finally {
    downloadingTemplate.value = false
  }
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
  completedTaskId.value = null
  passwordsAvailable.value = false
  passwordsDownloaded.value = false
  downloadingPasswords.value = false
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
        importStatus.value = 'Загрузка завершена!'
        importResults.value = {
          success: result.success !== false,
          created: result.created || 0,
          skipped: result.skipped || 0,
          total: result.total || 0,
          errors: result.errors || [],
          emailsSent: result.emails_sent || 0,
          emailsFailed: result.emails_failed || 0,
          emailsSkippedNoEmail: result.emails_skipped_no_email || 0,
        }
        completedTaskId.value = taskId
        passwordsAvailable.value = Boolean(taskStatus.passwords_available) && (result.created || 0) > 0
        passwordsDownloaded.value = isPasswordsDownloadedForTask(taskId)
        if (passwordsAvailable.value && !passwordsDownloaded.value) {
          storePasswordsTaskId(taskId)
        }
        if (result.logs && result.logs.length > 0) {
          const uniqueNewLogs = filterDuplicateLogs(result.logs)
          if (uniqueNewLogs.length > 0) {
            importLogs.value.push(...uniqueNewLogs)
            scrollLogsToBottom()
          }
        }
        if (result.created > 0) {
          toast.success(`Загружено пользователей: ${result.created}`)
        } else {
          toast.info('Новых пользователей не создано')
        }
        clearStorageTaskId()
        stopPolling()
        isImporting.value = false
      } else if (taskStatus.state === 'FAILURE') {
        importProgress.value = 100
        importStatus.value = 'Ошибка загрузки'
        importResults.value = {
          success: false,
          created: 0,
          skipped: 0,
          total: 0,
          errors: [taskStatus.error || 'Произошла ошибка при загрузке']
        }
        toast.error(taskStatus.error || 'Ошибка при загрузке пользователей')
        clearStorageTaskId()
        stopPolling()
        isImporting.value = false
      } else {
        pollTimeoutId = setTimeout(pollTaskStatus, 500)
      }
    } catch (pollError) {
      logError('Ошибка при получении статуса задачи:', pollError)
      pollTimeoutId = setTimeout(pollTaskStatus, 1000)
    }
  }

  pollTimeoutId = setTimeout(pollTaskStatus, 300)
  importTimeoutId = setTimeout(() => {
    if (isImporting.value) {
      stopPolling()
      isImporting.value = false
      toast.warning(
        'Загрузка ещё выполняется. Вы можете уйти со страницы и вернуться позже — нажмите «Продолжить отслеживание», чтобы снова увидеть прогресс.'
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
    toast.warning('Выберите файл для загрузки')
    return
  }
  
  isImporting.value = true
  resetImportState()
  importStatus.value = 'Запуск загрузки...'
  
  try {
    const uploadResult = await mediaApiClient.upload(selectedFile.value, {
      targetDir: 'imports/users',
      allowedTypes: ['xlsx', 'xls', 'csv'],
    })

    const response = await apiClient.post(cmsEndpoints.cms.importUsers, {
      file_path: uploadResult.path,
      send_welcome_emails: sendWelcomeEmails.value,
      welcome_email_subject: welcomeEmailSubject.value,
      welcome_email_body: welcomeEmailBody.value,
    })
    
    persistWelcomeEmailSettings()
    
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
    importStatus.value = 'Ошибка загрузки'
    
    const errorData = error.response?.data || {}
    
    importResults.value = {
      success: false,
      created: 0,
      skipped: 0,
      total: 0,
      errors: [errorData.error || 'Произошла ошибка при загрузке']
    }
    
    toast.error(errorData.error || 'Ошибка при запуске загрузки')
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

function extractFilenameFromContentDisposition(headers, defaultName) {
  const contentDisposition = headers?.['content-disposition']
  if (!contentDisposition) return defaultName

  const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  return match?.[1]?.replace(/['"]/g, '') || defaultName
}

function downloadBlobAsFile(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

async function extractDownloadErrorMessage(result, fallback = 'Не удалось скачать файл с паролями') {
  const blob = result?.data
  if (!(blob instanceof Blob)) {
    return result?.message || fallback
  }

  try {
    const text = await blob.text()
    if (!text) {
      return fallback
    }
    try {
      const parsed = JSON.parse(text)
      return parsed.error || parsed.message || parsed.detail || fallback
    } catch {
      return text.slice(0, 200) || fallback
    }
  } catch {
    return fallback
  }
}

const downloadPasswords = async () => {
  if (!canDownloadPasswords.value || downloadingPasswords.value) {
    return
  }

  const taskId = completedTaskId.value
  downloadingPasswords.value = true
  try {
    const result = await apiClient.downloadFile(
      cmsEndpoints.cms.importUsersPasswords(taskId),
    )

    if (!result.success || !result.data) {
      const message = await extractDownloadErrorMessage(result)
      if (result.status === 410) {
        markPasswordsDownloaded(taskId)
      }
      toast.error(message)
      return
    }

    const contentType = result.headers?.['content-type'] || result.data.type || ''
    if (contentType.includes('application/json')) {
      const message = await extractDownloadErrorMessage(result)
      toast.error(message)
      return
    }

    const filename = extractFilenameFromContentDisposition(
      result.headers,
      'import-users-passwords.xlsx',
    )
    downloadBlobAsFile(result.data, filename)
    markPasswordsDownloaded(taskId)
    toast.success('Файл с паролями скачан. Повторная загрузка недоступна.')
  } catch (error) {
    logError('Ошибка скачивания паролей импорта', error)
    const message = await extractDownloadErrorMessage(
      { data: error.response?.data, message: error.message },
    )
    toast.error(message || 'Ошибка при скачивании файла с паролями')
  } finally {
    downloadingPasswords.value = false
  }
}
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
      <SpinnerLoading color="primary" />
    </div>
    <div v-else-if="hasAdminAccess" class="admin-page">
      <div class="page-header">
        <h1 class="page-title">Загрузка пользователей</h1>
        <p class="page-subtitle">Загрузка учётных записей из файла Excel или CSV</p>
      </div>

      <div class="content-card">
        <button
          type="button"
          class="btn btn-primary d-inline-flex align-items-center gap-2 align-self-start"
          @click="goBack"
        >
          <ArrowLeft :size="16" />
          <span>К пользователям</span>
        </button>

      <div v-if="savedTaskId && !isImporting && !importResults" class="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2 mb-0">
        <span>Есть незавершённая загрузка. Вы можете продолжить отслеживание.</span>
        <button type="button" class="btn btn-primary d-inline-flex align-items-center gap-2" @click="resumeImport">
          Продолжить отслеживание
        </button>
      </div>

      <div class="alert alert-info mb-0">
        <div class="d-flex align-items-start justify-content-between flex-wrap gap-3">
          <div>
            <strong>Требования к файлу:</strong>
            <ul class="mb-0 mt-2">
              <li>Формат: Excel (.xlsx, .xls) или CSV (.csv)</li>
              <li>Обязательные столбцы: <code>Фамилия</code>, <code>Имя</code>, <code>Логин</code></li>
              <li>Опциональные столбцы: <code>Отчество</code>, <code>E-mail</code></li>
              <li>Для каждого нового пользователя генерируется случайный пароль</li>
              <li>После импорта пароли можно один раз скачать в Excel-файле</li>
              <li>Дубликаты определяются по логину; по E-mail — если в настройках сервера включена проверка уникальности email</li>
              <li>Перед загрузкой удалите пример строки из шаблона</li>
            </ul>
          </div>
          <button
            type="button"
            class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2 flex-shrink-0"
            :disabled="isImporting || downloadingTemplate"
            @click="handleDownloadTemplate"
          >
            <Loader2 v-if="downloadingTemplate" :size="15" class="spinner" />
            <Download v-else :size="15" />
            <span>{{ downloadingTemplate ? 'Формирование...' : 'Скачать шаблон' }}</span>
          </button>
        </div>
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
            <button
              type="button"
              class="btn-action btn-action--delete"
              aria-label="Удалить файл"
              @click.stop="removeFile"
            >
              <XCircle :size="15" />
            </button>
          </div>
        </template>
      </div>
      
      <div class="mb-4">
        <div class="form-check mb-3">
          <input
            id="sendWelcomeEmails"
            v-model="sendWelcomeEmails"
            type="checkbox"
            class="form-check-input"
            :disabled="isImporting"
            @change="persistWelcomeEmailSettings"
          />
          <label class="form-check-label" for="sendWelcomeEmails">
            Отправлять приветственные письма на электронную почту
          </label>
          <div class="form-text text-muted">
            По умолчанию письма не отправляются. Письма уходят только пользователям с указанным E-mail.
          </div>
        </div>

        <div v-if="sendWelcomeEmails" class="welcome-email-settings border rounded p-3 mb-3">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h6 class="mb-0">Текст приветственного письма</h6>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :disabled="isImporting"
              @click="resetWelcomeEmailTemplate"
            >
              Сбросить шаблон
            </button>
          </div>

          <div class="mb-3">
            <label class="form-label" for="welcomeEmailSubject">Тема письма</label>
            <input
              id="welcomeEmailSubject"
              v-model="welcomeEmailSubject"
              type="text"
              class="form-control"
              maxlength="200"
              :disabled="isImporting"
              @input="persistWelcomeEmailSettings"
            />
          </div>

          <div class="mb-3">
            <label class="form-label" for="welcomeEmailBody">Текст письма</label>
            <textarea
              id="welcomeEmailBody"
              v-model="welcomeEmailBody"
              class="form-control welcome-email-settings__textarea"
              rows="8"
              maxlength="5000"
              :disabled="isImporting"
              @input="persistWelcomeEmailSettings"
            />
          </div>

          <p v-if="welcomePlaceholders.length" class="form-text text-muted mb-0">
            Доступные подстановки:
            <code
              v-for="placeholder in welcomePlaceholders"
              :key="placeholder.key"
              class="me-2"
            >{{ '{' + placeholder.key + '}' }}</code>
          </p>
        </div>
        
        <button type="button" class="btn btn-primary d-inline-flex align-items-center gap-2" :disabled="!selectedFile || isImporting" @click="startImport">
          <Loader2 v-if="isImporting" :size="16" class="spinner" />
          <Upload v-else :size="16" />
          <span>{{ isImporting ? 'Загрузка...' : 'Начать загрузку' }}</span>
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
            <strong>{{ importResults.success ? 'Загрузка завершена' : 'Ошибка загрузки' }}</strong>
          </div>
          <ul class="mb-0">
            <li>Создано пользователей: <strong>{{ importResults.created }}</strong></li>
            <li>Пропущено (дубликаты или ошибки): <strong>{{ importResults.skipped }}</strong></li>
            <li v-if="importResults.emailsSent > 0">
              Отправлено приветственных писем: <strong>{{ importResults.emailsSent }}</strong>
            </li>
            <li v-if="importResults.emailsFailed > 0">
              Не удалось отправить писем: <strong>{{ importResults.emailsFailed }}</strong>
            </li>
            <li v-if="importResults.emailsSkippedNoEmail > 0">
              Без E-mail (письма не отправлены): <strong>{{ importResults.emailsSkippedNoEmail }}</strong>
            </li>
            <li v-if="importResults.errors.length > 0">Ошибок: <strong>{{ importResults.errors.length }}</strong></li>
          </ul>
        </div>

        <div
          v-if="canDownloadPasswords"
          class="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0"
        >
          <div>
            <strong class="d-block mb-1">Файл с паролями готов</strong>
            <span class="small">Скачивание доступно один раз. Сохраните файл в надёжное место.</span>
          </div>
          <button
            type="button"
            class="btn btn-warning d-inline-flex align-items-center gap-2 flex-shrink-0"
            :disabled="downloadingPasswords"
            @click="downloadPasswords"
          >
            <Loader2 v-if="downloadingPasswords" :size="16" class="spinner" />
            <Download v-else :size="16" />
            <span>{{ downloadingPasswords ? 'Скачивание...' : 'Скачать пароли (Excel)' }}</span>
          </button>
        </div>

        <div
          v-else-if="importResults.success && passwordsDownloaded"
          class="alert alert-secondary mb-0"
        >
          Файл с паролями уже был скачан. Повторная выгрузка недоступна.
        </div>
      </div>
      
      <div v-if="importLogs.length > 0" class="import-logs">
        <h6 class="mb-3">Журнал загрузки</h6>
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
@import './admin-page.scss';

.loading-container {
  min-height: 400px;
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

.welcome-email-settings {
  background-color: var(--color-secondary-background);

  &__textarea {
    font-family: var(--font-family-mono);
    font-size: 0.875rem;
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
