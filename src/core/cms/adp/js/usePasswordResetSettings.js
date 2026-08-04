import { ref, computed } from 'vue'
import {
  fetchPasswordResetSettings,
  getPasswordResetSettingsSync,
} from '@/core/cms/adp/js/passwordResetSettings.js'

export function usePasswordResetSettings() {
  const initial = getPasswordResetSettingsSync()
  const settings = ref(initial)
  // Показываем ссылку только после известного ответа (память после preload/fetch).
  const ready = ref(initial !== null)

  const showForgotPasswordLink = computed(
    () => ready.value && settings.value?.password_reset_available === true,
  )

  // В setup, не в onMounted: успеваем присоединиться к preload до первой отрисовки.
  void fetchPasswordResetSettings().then((next) => {
    settings.value = next
    ready.value = true
  })

  return {
    settings,
    ready,
    showForgotPasswordLink,
  }
}
