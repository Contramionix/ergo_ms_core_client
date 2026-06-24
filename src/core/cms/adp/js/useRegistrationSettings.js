import { ref, computed, onMounted } from 'vue'
import {
  fetchRegistrationSettings,
  getRegistrationSettingsSync,
  isOpenRegistrationMode,
} from '@/core/cms/adp/js/registrationSettings.js'

export function useRegistrationSettings() {
  const settings = ref(getRegistrationSettingsSync())
  const ready = ref(Boolean(settings.value))

  const showRegisterLink = computed(() => ready.value && isOpenRegistrationMode(settings.value))

  onMounted(async () => {
    settings.value = await fetchRegistrationSettings()
    ready.value = true
  })

  return {
    settings,
    ready,
    showRegisterLink,
  }
}
