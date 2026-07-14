import { computed } from 'vue'

import { useUserStore } from '@/core/cms/js/userStore.js'
import {
  bootstrapping,
  bootstrapError,
  whenSessionReady,
} from '@/js/bootstrapSession.js'

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
