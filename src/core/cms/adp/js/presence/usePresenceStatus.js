import { computed, ref, toValue, watch } from 'vue'

import {
  enqueueFetch,
  getStatus,
  hasStatus,
  presenceStore,
  readPresenceNow,
  unwatchPresence,
  watchPresence,
} from './presenceStore.js'

/**
 * Composable для отображения онлайн-статуса пользователя по public_id.
 * Используется с UserAvatar (prop presence) и PresenceIndicator.
 */
export function usePresenceStatus(publicIdSource) {
  const isLoading = ref(false)

  const publicId = computed(() => {
    const raw = toValue(publicIdSource)
    if (raw == null || raw === '') {
      return null
    }
    const value = String(raw).trim()
    if (!value || /^\d+$/.test(value)) {
      return null
    }
    return value
  })

  const status = computed(() => getStatus(publicId.value))
  const isKnown = computed(() => publicId.value != null && hasStatus(publicId.value))
  const now = computed(() => readPresenceNow())

  watch(
    publicId,
    (id, _prev, onCleanup) => {
      if (id == null) {
        isLoading.value = false
        return
      }

      watchPresence(id)
      onCleanup(() => unwatchPresence(id))
      if (hasStatus(id)) {
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
    now,
    presenceStore,
  }
}

export default usePresenceStatus
