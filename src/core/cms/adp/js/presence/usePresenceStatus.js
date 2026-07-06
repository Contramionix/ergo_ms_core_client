import { computed, ref, toValue, watch } from 'vue'

import { enqueueFetch, getStatus, hasStatus, presenceStore } from './presenceStore.js'

/**
 * Composable для отображения онлайн-статуса пользователя.
 * Используется с UserAvatar (prop presence) и PresenceIndicator.
 */
export function usePresenceStatus(userIdSource) {
  const isLoading = ref(false)

  const userId = computed(() => {
    const raw = toValue(userIdSource)
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null
  })

  const status = computed(() => getStatus(userId.value))
  const isKnown = computed(() => userId.value != null && hasStatus(userId.value))

  watch(
    userId,
    (id) => {
      if (id == null || hasStatus(id)) {
        isLoading.value = false
        return
      }

      isLoading.value = true
      enqueueFetch(id)
    },
    { immediate: true },
  )

  watch(isKnown, (known) => {
    if (known) {
      isLoading.value = false
    }
  })

  return {
    isOnline: computed(() => status.value.isOnline),
    lastSeen: computed(() => status.value.lastSeen),
    isKnown,
    isLoading,
    presenceStore,
  }
}

export default usePresenceStatus
