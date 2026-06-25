import { ref, computed, onMounted } from 'vue'
import {
  fetchPasswordResetSettings,
  getPasswordResetSettingsSync,
} from '@/core/cms/adp/js/passwordResetSettings.js'

export function usePasswordResetSettings() {
  const settings = ref(getPasswordResetSettingsSync())
  const ready = ref(Boolean(settings.value))

  const showForgotPasswordLink = computed(
    () => ready.value && settings.value?.password_reset_enabled !== false,
  )

  onMounted(async () => {
    settings.value = await fetchPasswordResetSettings()
    ready.value = true
  })

  return {
    settings,
    ready,
    showForgotPasswordLink,
  }
}
