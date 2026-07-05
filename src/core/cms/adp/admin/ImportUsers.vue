<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/js/utils/toast.js'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Info,
  Users,
} from 'lucide-vue-next'
import { apiClient } from '@/js/api/manager'
import { logError } from '@/js/utils/logError.js'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { cmsEndpoints } from '@/core/cms/js/endpoints'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { downloadImportUsersTemplate } from '@/core/cms/adp/admin/js/importUsersExcel.js'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
const router = useRouter()
const toast = useToast()

const breadcrumbItems = [
  { label: 'Пользователи', to: { name: 'UsersPanel' } },
  { label: 'Загрузка пользователей' },
]

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

const currentStep = computed(() => {
  if (importResults.value) {
    return 3
  }
  if (isImporting.value) {
    return 2
  }
  if (selectedFile.value) {
    return 1
  }
  return 0
})

const progressBarClass = computed(() => {
  if (isImporting.value) {
    return 'iu-progress-bar__fill--running iu-progress-bar__fill--animated'
  }
  if (importResults.value?.success) {
    return 'iu-progress-bar__fill--success'
  }
  if (importResults.value && !importResults.value.success) {
    return 'iu-progress-bar__fill--error'
  }
  return 'iu-progress-bar__fill--running'
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
    case 'success': return 'iu-log-entry--success'
    case 'error': return 'iu-log-entry--error'
    case 'warn': return 'iu-log-entry--warn'
    case 'info': return 'iu-log-entry--info'
    default: return 'iu-log-entry--default'
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
      <p class="page-subtitle">Массовое создание учётных записей из файла Excel или CSV</p>
    </div>

    <div class="import-users-shell">
      <Breadcrumbs :items="breadcrumbItems" class="import-users-breadcrumbs" />

      <div class="content-card">
      <div class="iu-body">
        <div
          v-if="savedTaskId && !isImporting && !importResults"
          class="iu-alert iu-alert--warning d-flex align-items-center justify-content-between flex-wrap gap-3"
        >
          <div class="iu-alert__content d-flex align-items-start gap-2">
            <AlertCircle :size="18" class="flex-shrink-0 mt-1" />
            <span>Есть незавершённая загрузка. Вы можете продолжить отслеживание прогресса.</span>
          </div>
          <button
            type="button"
            class="btn btn-primary d-inline-flex align-items-center gap-2 flex-shrink-0"
            @click="resumeImport"
          >
            Продолжить отслеживание
          </button>
        </div>

        <div class="iu-steps" aria-hidden="true">
          <div
            class="iu-step"
            :class="{ 'iu-step--active': currentStep >= 0, 'iu-step--done': currentStep > 0 }"
          >
            <span class="iu-step__num">1</span>
            <span class="iu-step__label">Файл</span>
          </div>
          <div class="iu-step__line" :class="{ 'iu-step__line--done': currentStep > 0 }" />
          <div
            class="iu-step"
            :class="{ 'iu-step--active': currentStep >= 1, 'iu-step--done': currentStep > 1 }"
          >
            <span class="iu-step__num">2</span>
            <span class="iu-step__label">Настройки</span>
          </div>
          <div class="iu-step__line" :class="{ 'iu-step__line--done': currentStep > 1 }" />
          <div
            class="iu-step"
            :class="{ 'iu-step--active': currentStep >= 2, 'iu-step--done': currentStep > 2 }"
          >
            <span class="iu-step__num">3</span>
            <span class="iu-step__label">Загрузка</span>
          </div>
          <div class="iu-step__line" :class="{ 'iu-step__line--done': currentStep > 2 }" />
          <div class="iu-step" :class="{ 'iu-step--active': currentStep >= 3 }">
            <span class="iu-step__num">4</span>
            <span class="iu-step__label">Результат</span>
          </div>
        </div>

        <section class="iu-section">
          <div class="iu-section__head">
            <div>
              <h2 class="iu-section__title">Подготовка файла</h2>
              <p class="iu-section__desc">
                Загрузите таблицу с пользователями. Для каждого нового аккаунта будет сгенерирован случайный пароль.
              </p>
            </div>
            <button
              type="button"
              class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2 flex-shrink-0"
              :disabled="isImporting || downloadingTemplate"
              @click="handleDownloadTemplate"
            >
              <Loader2 v-if="downloadingTemplate" :size="15" class="iu-spinner" />
              <Download v-else :size="15" />
              <span>{{ downloadingTemplate ? 'Формирование...' : 'Скачать шаблон' }}</span>
            </button>
          </div>

          <div class="iu-alert iu-alert--info">
            <Info :size="18" class="flex-shrink-0 mt-1" />
            <div class="iu-alert__content">
              <span class="iu-alert__title">Требования к файлу</span>
              <ul class="iu-requirements-list mb-0">
                <li>Формат: Excel (<code>.xlsx</code>, <code>.xls</code>) или CSV (<code>.csv</code>)</li>
                <li>Обязательные столбцы: <code>Фамилия</code>, <code>Имя</code>, <code>Логин</code></li>
                <li>Опциональные столбцы: <code>Отчество</code>, <code>E-mail</code></li>
                <li>После импорта пароли можно один раз скачать в Excel-файле</li>
                <li>Дубликаты определяются по логину; по E-mail — если в настройках сервера включена проверка уникальности email</li>
                <li>Перед загрузкой удалите пример строки из шаблона</li>
              </ul>
            </div>
          </div>

          <div
            class="iu-upload"
            :class="{
              'iu-upload--filled': selectedFile,
              'iu-upload--disabled': isImporting,
            }"
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
              <div class="iu-upload__icon-wrap">
                <Upload :size="28" />
              </div>
              <p class="iu-upload__title">Перетащите файл или нажмите для выбора</p>
              <p class="iu-upload__hint">Поддерживаются Excel (.xlsx, .xls) и CSV (.csv)</p>
            </template>

            <template v-else>
              <div class="iu-file-row">
                <div class="iu-file-row__icon">
                  <FileSpreadsheet :size="28" />
                </div>
                <div class="iu-file-row__info">
                  <p class="iu-file-row__name">{{ selectedFile.name }}</p>
                  <p class="iu-file-row__meta">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <button
                  type="button"
                  class="btn-action btn-action--delete"
                  aria-label="Удалить файл"
                  :disabled="isImporting"
                  @click.stop="removeFile"
                >
                  <XCircle :size="16" />
                </button>
              </div>
            </template>
          </div>
        </section>

        <section class="iu-section">
          <div class="iu-section__head">
            <div>
              <h2 class="iu-section__title">Приветственные письма</h2>
              <p class="iu-section__desc mb-0">
                По умолчанию письма не отправляются. Они уходят только пользователям с указанным E-mail.
              </p>
            </div>
          </div>

          <div
            class="iu-email-option"
            :class="{ 'iu-email-option--active': sendWelcomeEmails }"
          >
            <div class="iu-email-option__row">
              <input
                id="sendWelcomeEmails"
                v-model="sendWelcomeEmails"
                type="checkbox"
                class="iu-email-option__input"
                :disabled="isImporting"
                @change="persistWelcomeEmailSettings"
              />
              <label class="iu-email-option__label" for="sendWelcomeEmails">
                <span class="iu-email-option__text">
                  <strong>Отправлять приветственные письма на электронную почту</strong>
                  <small>Можно настроить тему и текст письма перед загрузкой</small>
                </span>
              </label>
            </div>
          </div>

          <div v-if="sendWelcomeEmails" class="iu-email-settings">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h3 class="iu-section__title mb-0">Текст приветственного письма</h3>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="isImporting"
                @click="resetWelcomeEmailTemplate"
              >
                Сбросить шаблон
              </button>
            </div>

            <div>
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

            <div>
              <label class="form-label" for="welcomeEmailBody">Текст письма</label>
              <textarea
                id="welcomeEmailBody"
                v-model="welcomeEmailBody"
                class="form-control iu-email-settings__textarea"
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
        </section>

        <div class="iu-actions">
          <button
            type="button"
            class="btn btn-primary d-inline-flex align-items-center gap-2"
            :disabled="!selectedFile || isImporting"
            @click="startImport"
          >
            <Loader2 v-if="isImporting" :size="16" class="iu-spinner" />
            <Users v-else :size="16" />
            <span>{{ isImporting ? 'Загрузка...' : 'Начать загрузку' }}</span>
          </button>
        </div>

        <section v-if="isImporting || importResults" class="iu-section">
          <div class="iu-section__head">
            <div>
              <h2 class="iu-section__title">Прогресс загрузки</h2>
              <p class="iu-section__desc mb-0">{{ importStatus || 'Ожидание запуска...' }}</p>
            </div>
            <p class="iu-progress-percent mb-0">{{ Math.round(progressPercent) }}%</p>
          </div>

          <div class="iu-progress-bar" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
            <div
              class="iu-progress-bar__fill"
              :class="progressBarClass"
              :style="{ width: progressPercent + '%' }"
            />
          </div>

          <div class="iu-stats">
            <div class="iu-stat">
              <span class="iu-stat__value">{{ currentStats.total || importResults?.total || 0 }}</span>
              <span class="iu-stat__label">Всего строк</span>
            </div>
            <div class="iu-stat iu-stat--info">
              <span class="iu-stat__value">{{ currentStats.processed || importResults?.total || 0 }}</span>
              <span class="iu-stat__label">Обработано</span>
            </div>
            <div class="iu-stat iu-stat--success">
              <span class="iu-stat__value">{{ currentStats.created || importResults?.created || 0 }}</span>
              <span class="iu-stat__label">Создано</span>
            </div>
            <div class="iu-stat iu-stat--warning">
              <span class="iu-stat__value">{{ currentStats.skipped || importResults?.skipped || 0 }}</span>
              <span class="iu-stat__label">Пропущено</span>
            </div>
          </div>
        </section>

        <template v-if="importResults">
          <div
            class="iu-alert"
            :class="importResults.success ? 'iu-alert--success' : 'iu-alert--danger'"
          >
            <CheckCircle v-if="importResults.success" :size="20" class="flex-shrink-0" />
            <XCircle v-else :size="20" class="flex-shrink-0" />
            <div class="iu-alert__content">
              <span class="iu-alert__title">
                {{ importResults.success ? 'Загрузка завершена' : 'Ошибка загрузки' }}
              </span>
              <ul class="iu-result-list mb-0">
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
                <li v-if="importResults.errors.length > 0">
                  Ошибок: <strong>{{ importResults.errors.length }}</strong>
                </li>
              </ul>
            </div>
          </div>

          <div
            v-if="canDownloadPasswords"
            class="iu-alert iu-alert--warning d-flex align-items-center justify-content-between flex-wrap gap-3"
          >
            <div class="iu-alert__content">
              <span class="iu-alert__title">Файл с паролями готов</span>
              <span class="small">Скачивание доступно один раз. Сохраните файл в надёжное место.</span>
            </div>
            <button
              type="button"
              class="btn btn-warning d-inline-flex align-items-center gap-2 flex-shrink-0"
              :disabled="downloadingPasswords"
              @click="downloadPasswords"
            >
              <Loader2 v-if="downloadingPasswords" :size="16" class="iu-spinner" />
              <Download v-else :size="16" />
              <span>{{ downloadingPasswords ? 'Скачивание...' : 'Скачать пароли (Excel)' }}</span>
            </button>
          </div>

          <div v-else-if="importResults.success && passwordsDownloaded" class="iu-alert iu-alert--muted">
            Файл с паролями уже был скачан. Повторная выгрузка недоступна.
          </div>
        </template>

        <section v-if="importLogs.length > 0" class="iu-section iu-logs">
          <h2 class="iu-section__title mb-0">Журнал загрузки</h2>
          <div ref="logsContainer" class="iu-logs__container">
            <div
              v-for="(log, index) in importLogs"
              :key="index"
              class="iu-log-entry"
              :class="getLogClass(log.level)"
            >
              <component
                :is="getLogIcon(log.level)"
                v-if="getLogIcon(log.level)"
                :size="16"
                class="flex-shrink-0 mt-1"
              />
              <span class="iu-log-entry__message">{{ log.message }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';
@import './import-users.scss';

.loading-container {
  min-height: 400px;
}

.import-users-shell {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

:deep(.import-users-breadcrumbs) {
  margin-bottom: 0;
}
</style>
