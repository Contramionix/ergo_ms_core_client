<template>
  <div class="user-avatar-wrap" :style="avatarStyle">
    <div class="user-avatar" :class="{ 'user-avatar--clickable': clickable }" :title="resolvedTitle">
      <ContentImage v-if="showPhoto" :src="readyPhotoSrc" :alt="resolvedTitle" class="user-avatar-image" loading="eager" decoding="async" @error="onImageError"/>
      <div v-else-if="isAvatarPending" class="user-avatar-placeholder" aria-hidden="true" />
      <DefaultAvatar v-else :size="size" :clickable="clickable" :title="resolvedTitle" :first-name="avatarNameParts.firstName" :last-name="avatarNameParts.lastName" :color-key="resolvedPublicId"/>
    </div>
    <PresenceIndicator v-if="showOnlineStatus" :visible="isKnown" :is-online="isOnline" :last-seen="lastSeen" :show-tooltip="showPresenceTooltip" :size="size"/>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import ContentImage from './ContentImage.vue'
import DefaultAvatar from './DefaultAvatar.vue'
import PresenceIndicator from '@/core/cms/adp/components/PresenceIndicator.vue'
import { usePresenceStatus } from '@/core/cms/adp/js/presence/usePresenceStatus.js'
import { getUserPublicInfoByRef, getCachedUserPublicInfoByRef, invalidateUserPublicInfoByRef, resolveAvatarNameParts, } from '@/js/userAvatar'
import { avatarCacheKey, ensureAvatarDisplaySrc, invalidateAvatar, peekAvatarDisplaySrc, } from '@/js/avatarCache.js'
import { logError } from '@/js/utils/logError.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()
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
    default: undefined
  },
  avatarUrl: {
    type: [String, null],
    default: undefined
  },
  customAvatarUrl: {
    type: [String, null],
    default: undefined
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
  /** @deprecated Используйте userRef (public_id); prop оставлен как alias. */
  presenceUserId: {
    type: [Number, String, null],
    default: null,
  },
})

const loadedPublicInfo = ref(null)
const imageError = ref(false)
const readyPhotoSrc = ref(null)
const activeCacheKey = ref('')

let refreshGeneration = 0

function pickNamePair(first, last) {
  const fn = (first || '').trim()
  const ln = (last || '').trim()
  return fn && ln ? { firstName: fn, lastName: ln } : null
}

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`
}))

const resolvedTitle = computed(() => props.title ?? t('common.user'))

const resolvedPublicId = computed(() => {
  if (props.userRef) return String(props.userRef)
  const storeRef = userStore.user?.public_id
  if (storeRef) return String(storeRef)
  const fromLoaded = loadedPublicInfo.value?.publicId || loadedPublicInfo.value?.public_id
  return fromLoaded ? String(fromLoaded) : null
})

const isCurrentUser = computed(() => {
  if (props.userRef) {
    const storeRef = userStore.user?.public_id
    return Boolean(storeRef) && String(storeRef) === String(props.userRef)
  }
  return !props.userRef
})

const presencePublicId = computed(() => {
  if (!props.showOnlineStatus) return null
  // Явный prop: только non-numeric public_id (числовой pk игнорируем).
  const explicit = props.presenceUserId != null ? String(props.presenceUserId).trim() : ''
  if (explicit && !/^\d+$/.test(explicit)) return explicit
  return resolvedPublicId.value
})

const { isOnline, lastSeen, isKnown } = usePresenceStatus(presencePublicId)

const hasPropNames = computed(() => Boolean(pickNamePair(props.firstName, props.lastName)))

const avatarNameParts = computed(() => {
  const fromProps = pickNamePair(props.firstName, props.lastName)
  if (fromProps) return fromProps

  if (isCurrentUser.value) {
    const fromStore = pickNamePair(
      userStore.user?.first_name || userStore.profile?.firstName,
      userStore.user?.last_name || userStore.profile?.lastName,
    )
    if (fromStore) return fromStore
  }

  const fromPublic = pickNamePair(
    loadedPublicInfo.value?.firstName,
    loadedPublicInfo.value?.lastName,
  )
  if (fromPublic) return fromPublic

  // Ждём public-info по user-ref: не парсим title (орг. «Фамилия Имя Отчество» ≠ Ergo-ФИО).
  if (props.userRef && !isCurrentUser.value && loadedPublicInfo.value === null) {
    return { firstName: '', lastName: '' }
  }

  return resolveAvatarNameParts({ fullName: resolvedTitle.value })
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
  if (!props.userRef) return false
  // Только реальные props first/last с API — не локальный разбор full_name.
  const hasExplicitAvatar = props.avatarUrl !== undefined || props.customAvatarUrl !== undefined
  return !hasPropNames.value || !hasExplicitAvatar
})

async function loadUserInfo() {
  if (!needsPublicInfoLoad.value) {
    loadedPublicInfo.value = null
    return
  }

  if (props.userRef) {
    const cachedByRef = getCachedUserPublicInfoByRef(props.userRef)
    if (cachedByRef && pickNamePair(cachedByRef.firstName, cachedByRef.lastName)) {
      loadedPublicInfo.value = cachedByRef
      return
    }
    try {
      loadedPublicInfo.value = await getUserPublicInfoByRef(props.userRef)
    } catch (error) {
      logError('Ошибка загрузки публичных данных пользователя по ref', error)
      loadedPublicInfo.value = null
    }
  }
}

onMounted(async () => {
  if (!userStore.isInitialized) {
    await userStore.ensureUserReady()
  }
  await loadUserInfo()
})

watch(
  () => [props.avatarUrl, props.customAvatarUrl, props.userRef, props.firstName, props.lastName],
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

:deep(.ergo-content-image) {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 50%;
}

:deep(.user-avatar-image) {
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