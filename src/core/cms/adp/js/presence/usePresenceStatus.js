import { computed, ref, toValue, watch } from 'vue'

import { fetchBatch, getStatus, hasStatus, presenceStore } from './presenceStore.js'

/**
 * Composable для отображения онлайн-статуса пользователя.
 * Будущая интеграция с UserAvatar: usePresenceStatus(userId) + PresenceIndicator.
 */
export function usePresenceStatus(userIdSource) {
  const isLoading = ref(false)

  const userId = computed(() => {
    const raw = toValue(userIdSource)
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null
  })

  const status = computed(() => getStatus(userId.value))

  watch(
    userId,
    async (id) => {
      if (id == null || hasStatus(id)) {
        return
      }

      isLoading.value = true
      try {
        await fetchBatch([id])
      } finally {
        isLoading.value = false
      }
    },
    { immediate: true },
  )

  return {
    isOnline: computed(() => status.value.isOnline),
    lastSeen: computed(() => status.value.lastSeen),
    isLoading,
    presenceStore,
  }
}

export default usePresenceStatus
