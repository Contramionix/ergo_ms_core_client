import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { checkAccessToAdminPanel } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { accessDeniedState } from '@/js/accessDeniedState'
import { tGlobal } from '@/i18n/index.js'
import { downloadImportUsersTemplate } from '@/core/cms/adp/admin/js/importUsersExcel.js'
import { logError } from '@/js/utils/logError.js'
import { useImportUsersWelcomeEmail } from '@/core/cms/adp/admin/js/useImportUsersWelcomeEmail.js'
import { useImportUsersImportTask } from '@/core/cms/adp/admin/js/useImportUsersImportTask.js'

export function useImportUsers() {
  const toast = useToast()
  const welcomeEmail = useImportUsersWelcomeEmail()
  const importTask = useImportUsersImportTask(welcomeEmail)

  const breadcrumbItems = computed(() => [
    { label: tGlobal('admin.importUsers.breadcrumbUsers'), to: { name: 'UsersPanel' } },
    { label: tGlobal('admin.importUsers.breadcrumb') },
  ])

  const hasAdminAccess = ref(false)
  const isCheckingAccess = ref(true)

  onMounted(async () => {
    try {
      const accessData = await checkAccessToAdminPanel()
      if (!accessData.access_to_panel) {
        toast.error(tGlobal('admin.importUsers.noAdminAccess'))
        accessDeniedState.active = true
        accessDeniedState.title = tGlobal('admin.access.deniedTitle')
        accessDeniedState.message = tGlobal('admin.access.adminRequired')
        return
      }
      hasAdminAccess.value = true
      welcomeEmail.restoreWelcomeEmailSettings()
      importTask.restoreSavedTaskId()
      await Promise.all([
        welcomeEmail.loadWelcomeEmailDefaults(),
        importTask.restorePasswordsDownloadState(),
      ])
    } catch (error) {
      logError('Ошибка проверки прав доступа:', error)
      toast.error(tGlobal('admin.importUsers.accessCheckError'))
      accessDeniedState.active = true
      accessDeniedState.title = tGlobal('admin.access.deniedTitle')
      accessDeniedState.message = tGlobal('admin.importUsers.accessCheckFailed')
    } finally {
      isCheckingAccess.value = false
    }
  })

  onBeforeUnmount(() => {
    importTask.stopPolling()
  })

  const handleDownloadTemplate = async () => {
    if (importTask.downloadingTemplate.value || importTask.isImporting.value) {
      return
    }

    importTask.downloadingTemplate.value = true
    try {
      await downloadImportUsersTemplate()
    } catch (error) {
      logError('Ошибка формирования шаблона загрузки пользователей', error)
      toast.error(tGlobal('admin.importUsers.templateBuildError'))
    } finally {
      importTask.downloadingTemplate.value = false
    }
  }

  return {
    breadcrumbItems,
    canDownloadPasswords: importTask.canDownloadPasswords,
    currentStats: importTask.currentStats,
    currentStep: importTask.currentStep,
    downloadPasswords: importTask.downloadPasswords,
    downloadingPasswords: importTask.downloadingPasswords,
    downloadingTemplate: importTask.downloadingTemplate,
    fileInput: importTask.fileInput,
    getLogClass: importTask.getLogClass,
    getLogIcon: importTask.getLogIcon,
    handleDownloadTemplate,
    handleDragOver: importTask.handleDragOver,
    handleDrop: importTask.handleDrop,
    handleFileSelect: importTask.handleFileSelect,
    hasAdminAccess,
    importLogs: importTask.importLogs,
    importResults: importTask.importResults,
    importStatus: importTask.importStatus,
    isCheckingAccess,
    isImporting: importTask.isImporting,
    logsContainer: importTask.logsContainer,
    passwordsDownloaded: importTask.passwordsDownloaded,
    persistWelcomeEmailSettings: welcomeEmail.persistWelcomeEmailSettings,
    progressBarClass: importTask.progressBarClass,
    progressPercent: importTask.progressPercent,
    removeFile: importTask.removeFile,
    resetWelcomeEmailTemplate: welcomeEmail.resetWelcomeEmailTemplate,
    resumeImport: importTask.resumeImport,
    savedTaskId: importTask.savedTaskId,
    selectedFile: importTask.selectedFile,
    sendWelcomeEmails: welcomeEmail.sendWelcomeEmails,
    startImport: importTask.startImport,
    triggerFileInput: importTask.triggerFileInput,
    welcomeEmailBody: welcomeEmail.welcomeEmailBody,
    welcomeEmailSubject: welcomeEmail.welcomeEmailSubject,
    welcomePlaceholders: welcomeEmail.welcomePlaceholders,
  }
}
