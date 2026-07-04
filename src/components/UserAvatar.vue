<template>
  <div class="user-avatar-wrap" :style="avatarStyle">
    <div class="user-avatar" :class="{ 'user-avatar--clickable': clickable }" :title="title">
      <img
        v-if="showPhoto"
        :src="readyPhotoSrc"
        :alt="title"
        class="user-avatar-image"
        @error="onImageError"
      />
      <div v-else-if="isAvatarPending" class="user-avatar-placeholder" aria-hidden="true" />
      <DefaultAvatar
        v-else
        :size="size"
        :clickable="clickable"
        :title="title"
        :first-name="effectiveFirstName"
        :last-name="effectiveLastName"
      />
    </div>
    <PresenceIndicator
      v-if="showOnlineStatus"
      :visible="isKnown"
      :is-online="isOnline"
      :last-seen="lastSeen"
      :show-tooltip="showPresenceTooltip"
      :size="size"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import DefaultAvatar from './DefaultAvatar.vue'
import PresenceIndicator from '@/core/cms/adp/components/PresenceIndicator.vue'
import { usePresenceStatus } from '@/core/cms/adp/js/presence/usePresenceStatus.js'
import {
  getUserPublicInfo,
  getCachedUserPublicInfo,
  invalidateUserPublicInfo,
  getUserPublicInfoByRef,
  getCachedUserPublicInfoByRef,
  invalidateUserPublicInfoByRef,
} from '@/js/userAvatar'
import {
  avatarCacheKey,
  ensureAvatarDisplaySrc,
  invalidateAvatar,
  peekAvatarDisplaySrc,
} from '@/js/avatarCache.js'
import { logError } from '@/js/utils/logError.js'

const userStore = useUserStore()

const props = defineProps({
  size: {
    type: Number,
    default: 40
  },
  clickable: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Пользователь'
  },
  avatarUrl: {
    type: [String, null],
    default: undefined
  },
  customAvatarUrl: {
    type: [String, null],
    default: undefined
  },
  userId: {
    type: [Number, String, null],
    default: null
  },
  userRef: {
    type: [String, null],
    default: null
  },
  firstName: {
    type: [String, null],
    default: null
  },
  lastName: {
    type: [String, null],
    default: null
  },
  showOnlineStatus: {
    type: Boolean,
    default: false
  },
  showPresenceTooltip: {
    type: Boolean,
    default: false
  },
})

const loadedPublicInfo = ref(null)
const imageError = ref(false)
const readyPhotoSrc = ref(null)
const activeCacheKey = ref('')

let refreshGeneration = 0

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`
}))

const normalizedUserId = computed(() => {
  if (props.userId == null) return null
  const parsed = Number(props.userId)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
})

const isCurrentUser = computed(() => {
  if (props.userRef) {
    const storeRef = userStore.user?.public_id
    return Boolean(storeRef) && String(storeRef) === String(props.userRef)
  }
  if (normalizedUserId.value === null) return true
  const storeUserId = Number(userStore.user?.id)
  return Number.isFinite(storeUserId) && storeUserId === normalizedUserId.value
})

const presenceUserId = computed(() => {
  if (!props.showOnlineStatus) {
    return null
  }

  if (normalizedUserId.value !== null) {
    return normalizedUserId.value
  }

  if (isCurrentUser.value) {
    const storeUserId = Number(userStore.user?.id)
    return Number.isFinite(storeUserId) ? storeUserId : null
  }

  return null
})

const { isOnline, lastSeen, isKnown } = usePresenceStatus(presenceUserId)

const effectiveFirstName = computed(() => {
  if (props.firstName) return props.firstName
  if (isCurrentUser.value && userStore.user?.first_name) return userStore.user.first_name
  return loadedPublicInfo.value?.firstName || null
})

const effectiveLastName = computed(() => {
  if (props.lastName) return props.lastName
  if (isCurrentUser.value && userStore.user?.last_name) return userStore.user.last_name
  return loadedPublicInfo.value?.lastName || null
})

const displayAvatarUrl = computed(() => {
  if (props.avatarUrl !== undefined) return props.avatarUrl
  if (props.customAvatarUrl !== undefined) return props.customAvatarUrl
  if (loadedPublicInfo.value?.avatarUrl) return loadedPublicInfo.value.avatarUrl
  if (isCurrentUser.value) return userStore.avatarUrl || null
  return null
})

const showPhoto = computed(() => Boolean(readyPhotoSrc.value) && !imageError.value)

const isAvatarPending = computed(
  () => Boolean(displayAvatarUrl.value) && !showPhoto.value && !imageError.value,
)

async function refreshAvatarSrc() {
  const generation = ++refreshGeneration
  const url = displayAvatarUrl.value

  if (!url) {
    readyPhotoSrc.value = null
    activeCacheKey.value = ''
    imageError.value = false
    return
  }

  const cacheKey = avatarCacheKey(url)
  if (readyPhotoSrc.value && activeCacheKey.value === cacheKey) {
    return
  }

  const syncSrc = peekAvatarDisplaySrc(url)
  if (syncSrc) {
    readyPhotoSrc.value = syncSrc
    activeCacheKey.value = cacheKey
    imageError.value = false
    return
  }

  imageError.value = false

  if (activeCacheKey.value !== cacheKey) {
    readyPhotoSrc.value = null
  }

  const src = await ensureAvatarDisplaySrc(url)
  if (generation !== refreshGeneration || displayAvatarUrl.value !== url) {
    return
  }

  if (src) {
    readyPhotoSrc.value = src
    activeCacheKey.value = cacheKey
    return
  }

  readyPhotoSrc.value = null
  activeCacheKey.value = ''
  imageError.value = true
}

watch(displayAvatarUrl, refreshAvatarSrc, { immediate: true })

const needsPublicInfoLoad = computed(() => {
  if (isCurrentUser.value) return false
  if (normalizedUserId.value === null && !props.userRef) return false
  const hasNames = Boolean(props.firstName) && Boolean(props.lastName)
  const hasExplicitAvatar = props.avatarUrl !== undefined || props.customAvatarUrl !== undefined
  return !hasNames || !hasExplicitAvatar
})

async function loadUserInfo() {
  if (!needsPublicInfoLoad.value) {
    loadedPublicInfo.value = null
    return
  }

  if (props.userRef) {
    const cachedByRef = getCachedUserPublicInfoByRef(props.userRef)
    if (cachedByRef) {
      loadedPublicInfo.value = cachedByRef
      return
    }
    try {
      loadedPublicInfo.value = await getUserPublicInfoByRef(props.userRef)
    } catch (error) {
      logError('Ошибка загрузки публичных данных пользователя по ref', error)
      loadedPublicInfo.value = null
    }
    return
  }

  const id = normalizedUserId.value
  const cached = getCachedUserPublicInfo(id)
  if (cached) {
    loadedPublicInfo.value = cached
    return
  }

  try {
    loadedPublicInfo.value = await getUserPublicInfo(id)
  } catch (error) {
    logError('Ошибка загрузки публичных данных пользователя', error)
    loadedPublicInfo.value = null
  }
}

onMounted(async () => {
  if (!userStore.isInitialized) {
    await userStore.initializeUser()
  }
  await loadUserInfo()
})

watch(
  () => [props.avatarUrl, props.customAvatarUrl, props.userId, props.userRef, props.firstName, props.lastName],
  loadUserInfo
)

watch(
  () => userStore.avatarUrl,
  () => {
    if (props.avatarUrl === undefined && props.customAvatarUrl === undefined) {
      loadUserInfo()
    }
  }
)

async function onImageError() {
  const url = displayAvatarUrl.value
  imageError.value = true
  readyPhotoSrc.value = null

  if (props.avatarUrl !== undefined || props.customAvatarUrl !== undefined) return

  if (isCurrentUser.value) {
    invalidateAvatar(url)
    await userStore.loadAvatar()
    imageError.value = false
    return
  }

  if (props.userRef) {
    invalidateUserPublicInfoByRef(props.userRef)
    try {
      loadedPublicInfo.value = await getUserPublicInfoByRef(props.userRef)
      imageError.value = false
    } catch {
      // остаётся DefaultAvatar
    }
    return
  }

  const id = normalizedUserId.value
  if (id !== null) {
    invalidateUserPublicInfo(id)
    try {
      loadedPublicInfo.value = await getUserPublicInfo(id)
      imageError.value = false
    } catch {
      // остаётся DefaultAvatar
    }
  }
}
</script>

<style scoped lang="scss">
.user-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.user-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  transition: transform 0.2s ease;
  user-select: none;

  &--clickable {
    cursor: pointer;

    &:hover {
      transform: scale(1.05);
    }
  }
}

.user-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: block;

  .user-avatar--clickable:hover & {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}

.user-avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--ui-surface-2, #e9ecef);
  flex-shrink: 0;
}
</style>
