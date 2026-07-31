import { ref } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { apiClient } from '@/js/api/manager'
import { logError } from '@/js/utils/logError.js'
import { cmsEndpoints } from '@/core/cms/js/endpoints'
import { tGlobal } from '@/i18n/index.js'
import {
  loadWelcomeEmailDraft,
  saveWelcomeEmailDraft,
} from '@/core/cms/adp/admin/js/importUsersDraft.js'

export function useImportUsersWelcomeEmail() {
  const toast = useToast()

  const sendWelcomeEmails = ref(false)
  const welcomeEmailSubject = ref('')
  const welcomeEmailBody = ref('')
  const welcomePlaceholders = ref([])

  const persistWelcomeEmailSettings = () => {
    saveWelcomeEmailDraft({
      sendWelcomeEmails: sendWelcomeEmails.value,
      subject: welcomeEmailSubject.value,
      body: welcomeEmailBody.value,
    })
  }

  const restoreWelcomeEmailSettings = () => {
    const stored = loadWelcomeEmailDraft()
    if (!stored) return
    sendWelcomeEmails.value = stored.sendWelcomeEmails
    if (stored.subject) {
      welcomeEmailSubject.value = stored.subject
    }
    if (stored.body) {
      welcomeEmailBody.value = stored.body
    }
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
      toast.error(tGlobal('admin.importUsers.defaultTemplateError'))
    }
  }

  return {
    loadWelcomeEmailDefaults,
    persistWelcomeEmailSettings,
    resetWelcomeEmailTemplate,
    restoreWelcomeEmailSettings,
    sendWelcomeEmails,
    welcomeEmailBody,
    welcomeEmailSubject,
    welcomePlaceholders,
  }
}
