import { ref, computed } from 'vue'
import {
  fetchRegistrationSettings,
  getRegistrationSettingsSync,
  isOpenRegistrationMode,
} from '@/core/cms/adp/js/registrationSettings.js'

export function useRegistrationSettings() {
  const initial = getRegistrationSettingsSync()
  const settings = ref(initial)
  const ready = ref(initial !== null)

  const showRegisterLink = computed(() => ready.value && isOpenRegistrationMode(settings.value))

  void fetchRegistrationSettings().then((next) => {
    settings.value = next
    ready.value = true
  })

  return {
    settings,
    ready,
    showRegisterLink,
  }
}
