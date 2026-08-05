import { ref, computed, nextTick } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-vue-next'
import { apiClient } from '@/js/api/manager'
import { logError } from '@/js/utils/logError.js'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { buildMediaUploadOptions } from '@/js/mediaUploadLimits.js'
import { cmsEndpoints } from '@/core/cms/js/endpoints'
import { tGlobal } from '@/i18n/index.js'
import { downloadBlob, extractFilenameFromHeaders } from '@/js/utils/file-helpers.js'

const STORAGE_KEY_TASK_ID = 'cms_import_users_task_id'
const STORAGE_KEY_PASSWORDS_TASK_ID = 'cms_import_users_passwords_task_id'
const STORAGE_KEY_PASSWORDS_DOWNLOADED = 'cms_import_users_passwords_downloaded'
const POLL_TIMEOUT_MS = 1800000

export function useImportUsersImportTask(welcomeEmail) {
  const toast = useToast()

  const fileInput = ref(null)
  const selectedFile = ref(null)
  const isImporting = ref(false)
  const importResults = ref(null)
  const importLogs = ref([])
  const importProgress = ref(0)
  const importStatus = ref('')
  const logsContainer = ref(null)
  const completedTaskId = ref(null)
  const passwordsAvailable = ref(false)
  const passwordsDownloaded = ref(false)
  const downloadingPasswords = ref(false)
  const downloadingTemplate = ref(false)
  const savedTaskId = ref(null)

  let pollTimeoutId = null
  let importTimeoutId = null

  const currentStats = ref({
    total: 0,
    processed: 0,
    created: 0,
    skipped: 0,
  })

  const progressPercent = computed(() => Math.min(100, Math.max(0, importProgress.value)))

  const currentStep = computed(() => {
    if (importResults.value) return 3
    if (isImporting.value) return 2
    if (selectedFile.value) return 1
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
    } catch (_e) { /* sessionStorage unavailable */ }
    savedTaskId.value = null
  }

  const clearPasswordsTaskStorage = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_PASSWORDS_TASK_ID)
    } catch (_e) { /* sessionStorage unavailable */ }
  }

  const markPasswordsDownloaded = (taskId) => {
    passwordsDownloaded.value = true
    passwordsAvailable.value = false
    try {
      sessionStorage.setItem(STORAGE_KEY_PASSWORDS_DOWNLOADED, taskId)
    } catch (_e) { /* sessionStorage unavailable */ }
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
    } catch (_e) { /* sessionStorage unavailable */ }
  }

  const restorePasswordsDownloadState = async () => {
    let taskId = null
    try {
      taskId = sessionStorage.getItem(STORAGE_KEY_PASSWORDS_TASK_ID)
    } catch (_e) { /* sessionStorage unavailable */ }

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
      importStatus.value = tGlobal('admin.importUsers.completed')
    } catch (error) {
      logError('Ошибка восстановления выгрузки паролей', error)
      clearPasswordsTaskStorage()
    }
  }

  const restoreSavedTaskId = () => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_TASK_ID)
      if (stored) savedTaskId.value = stored
    } catch (_e) { /* sessionStorage unavailable */ }
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

  const isValidFileExtension = (fileName) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv']
    return allowedExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
  }

  const filterDuplicateLogs = (newLogs) => {
    return newLogs.filter(newLog => {
      return !importLogs.value.some(existingLog =>
        existingLog.level === newLog.level
        && existingLog.message === newLog.message,
      )
    })
  }

  const getAdaptivePollInterval = (progress) => {
    if (progress < 10) return 300
    if (progress < 50) return 500
    if (progress < 90) return 800
    return 500
  }

  const scrollLogsToBottom = async () => {
    await nextTick()
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  }

  function runPolling(taskId) {
    let lastLogIndex = 0

    const pollTaskStatus = async () => {
      if (!isImporting.value) return

      try {
        const statusResponse = await apiClient.get(
          cmsEndpoints.cms.importUsersTaskStatus(taskId),
          { params: { last_log_index: lastLogIndex } },
        )
        const taskStatus = statusResponse.data

        if (taskStatus.state === 'PROGRESS') {
          currentStats.value = {
            total: taskStatus.total || 0,
            processed: taskStatus.current || 0,
            created: taskStatus.created || 0,
            skipped: taskStatus.skipped || 0,
          }
          importProgress.value = taskStatus.progress || 0
          importStatus.value = tGlobal('admin.importUsers.processing', {
            current: taskStatus.current,
            total: taskStatus.total,
          })

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
            skipped: result.skipped || 0,
          }
          importProgress.value = 100
          importStatus.value = tGlobal('admin.importUsers.completedExclaim')
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
            toast.success(tGlobal('admin.importUsers.importedCount', { count: result.created }))
          } else {
            toast.info(tGlobal('admin.importUsers.noneCreated'))
          }
          clearStorageTaskId()
          stopPolling()
          isImporting.value = false
        } else if (taskStatus.state === 'FAILURE') {
          importProgress.value = 100
          importStatus.value = tGlobal('admin.importUsers.resultError')
          importResults.value = {
            success: false,
            created: 0,
            skipped: 0,
            total: 0,
            errors: [taskStatus.error || tGlobal('admin.importUsers.genericError')],
          }
          toast.error(taskStatus.error || tGlobal('admin.importUsers.importError'))
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
        toast.warning(tGlobal('admin.importUsers.leaveHint'))
      }
    }, POLL_TIMEOUT_MS)
  }

  const resumeImport = () => {
    const taskId = savedTaskId.value
    if (!taskId) return
    isImporting.value = true
    resetImportState()
    importStatus.value = tGlobal('admin.importUsers.resumeTracking')
    runPolling(taskId)
  }

  const startImport = async () => {
    if (!selectedFile.value) {
      toast.warning(tGlobal('admin.importUsers.selectFile'))
      return
    }

    isImporting.value = true
    resetImportState()
    importStatus.value = tGlobal('admin.importUsers.starting')

    try {
      const uploadResult = await mediaApiClient.upload(
        selectedFile.value,
        buildMediaUploadOptions({
          targetDir: 'imports/users',
          allowedTypes: ['xlsx', 'xls', 'csv'],
        }),
      )

      const response = await apiClient.post(cmsEndpoints.cms.importUsers, {
        file_path: uploadResult.path,
        send_welcome_emails: welcomeEmail.sendWelcomeEmails.value,
        welcome_email_subject: welcomeEmail.welcomeEmailSubject.value,
        welcome_email_body: welcomeEmail.welcomeEmailBody.value,
      })

      welcomeEmail.persistWelcomeEmailSettings()

      if (!response.data || !response.data.task_id) {
        throw new Error(tGlobal('admin.importUsers.noTaskId'))
      }

      const taskId = response.data.task_id
      try {
        sessionStorage.setItem(STORAGE_KEY_TASK_ID, taskId)
      } catch (_e) { /* sessionStorage unavailable */ }
      savedTaskId.value = taskId
      importStatus.value = tGlobal('admin.importUsers.processingFile')

      runPolling(taskId)
    } catch (error) {
      importProgress.value = 100
      importStatus.value = tGlobal('admin.importUsers.resultError')

      const errorData = error.response?.data || {}

      importResults.value = {
        success: false,
        created: 0,
        skipped: 0,
        total: 0,
        errors: [errorData.error || tGlobal('admin.importUsers.genericError')],
      }

      toast.error(errorData.error || tGlobal('admin.importUsers.startError'))
      isImporting.value = false
    }
  }

  const triggerFileInput = () => {
    fileInput.value?.click()
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (!isValidFileExtension(file.name)) {
        toast.error(tGlobal('admin.importUsers.fileTypeError'))
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
        toast.error(tGlobal('admin.importUsers.fileTypeError'))
        return
      }
      selectedFile.value = file
      resetImportState()
    }
  }

  const removeFile = () => {
    selectedFile.value = null
    resetImportState()
    if (fileInput.value) {
      fileInput.value.value = ''
    }
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

  async function extractDownloadErrorMessage(result, fallback = tGlobal('admin.importUsers.downloadPasswordsFallback')) {
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

      const filename = extractFilenameFromHeaders(
        result.headers,
        'import-users-passwords.xlsx',
      )
      downloadBlob(result.data, filename)
      markPasswordsDownloaded(taskId)
      toast.success(tGlobal('admin.importUsers.passwordsDownloaded'))
    } catch (error) {
      logError('Ошибка скачивания паролей импорта', error)
      const message = await extractDownloadErrorMessage(
        { data: error.response?.data, message: error.message },
      )
      toast.error(message || tGlobal('admin.importUsers.downloadPasswordsError'))
    } finally {
      downloadingPasswords.value = false
    }
  }

  return {
    canDownloadPasswords,
    currentStats,
    currentStep,
    downloadPasswords,
    downloadingPasswords,
    downloadingTemplate,
    fileInput,
    getLogClass,
    getLogIcon,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    importLogs,
    importResults,
    importStatus,
    isImporting,
    logsContainer,
    passwordsDownloaded,
    progressBarClass,
    progressPercent,
    removeFile,
    resetImportState,
    restorePasswordsDownloadState,
    restoreSavedTaskId,
    resumeImport,
    savedTaskId,
    selectedFile,
    startImport,
    stopPolling,
    triggerFileInput,
  }
}
