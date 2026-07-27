import { computed } from 'vue'

import { useUserStore } from '@/core/cms/js/userStore.js'
// side-effect: registerSessionBootstrap
import '@/js/bootstrapSession.js'
import {
  bootstrapping,
  bootstrapError,
  whenSessionReady,
} from '@/js/sessionReady.js'

export function useAppBootstrap() {
  const userStore = useUserStore()

  const sessionBootstrapping = computed(
    () => bootstrapping.value || (!userStore.isInitialized && userStore.isLoading),
  )

  return {
    bootstrapping: sessionBootstrapping,
    bootstrapError,
    whenSessionReady,
  }
}
