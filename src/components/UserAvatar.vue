<template>
  <div class="user-avatar-wrap" :style="avatarStyle">
    <div class="user-avatar" :class="{ 'user-avatar--clickable': clickable }" :title="title">
      <DefaultAvatar :size="size" :clickable="clickable" :title="title" :first-name="effectiveFirstName" :last-name="effectiveLastName"/>
      <img v-if="hasCustomAvatar" :src="resolvedAvatarSrc" :alt="title" class="user-avatar-image" :class="{ 'is-loaded': imageLoaded }" @load="onImageLoad" @error="onImageError" />
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
import { getUserPublicInfo, getCachedUserPublicInfo, invalidateUserPublicInfo, } from '@/js/userAvatar'
import { peekAvatar, resolveAvatar, invalidateAvatar } from '@/js/avatarCache.js'

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
const imageLoaded = ref(false)
// Стабильный source аватарки: blob из централизованного кеша, либо прямой URL как откат.
const resolvedAvatarSrc = ref(null)

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

const hasCustomAvatar = computed(() => Boolean(resolvedAvatarSrc.value) && !imageError.value)

const triedDirectFallback = ref(false)

function setResolvedSrc(next) {
  if (resolvedAvatarSrc.value === next) return
  imageLoaded.value = false
  resolvedAvatarSrc.value = next
}

async function refreshAvatarSrc() {
  imageError.value = false
  triedDirectFallback.value = false

  const url = displayAvatarUrl.value
  if (!url) {
    setResolvedSrc(null)
    return
  }

  // Синхронный hit из памяти — фото показывается с первого кадра, без мигания.
  const cached = peekAvatar(url)
  if (cached) {
    setResolvedSrc(cached)
    return
  }

  setResolvedSrc(null)

  // Cache API (переживает Ctrl+F5) -> сеть. При сбое — откат на прямой URL.
  const resolved = await resolveAvatar(url)
  if (displayAvatarUrl.value !== url) return
  setResolvedSrc(resolved || url)
}

watch(displayAvatarUrl, refreshAvatarSrc, { immediate: true })

function onImageLoad() {
  imageLoaded.value = true
}

const needsPublicInfoLoad = computed(() => {
  if (normalizedUserId.value === null) return false
  if (isCurrentUser.value) return false
  const hasNames = Boolean(props.firstName) && Boolean(props.lastName)
  const hasExplicitAvatar = props.avatarUrl !== undefined || props.customAvatarUrl !== undefined
  return !hasNames || !hasExplicitAvatar
})

async function loadUserInfo() {
  imageError.value = false

  if (!needsPublicInfoLoad.value) {
    loadedPublicInfo.value = null
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
    logError(`Ошибка загрузки публичных данных пользователя ${id}:`, error)
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
  () => [props.avatarUrl, props.customAvatarUrl, props.userId, props.firstName, props.lastName],
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

  // Если не смог отрисоваться blob из кеша — сбрасываем кеш и один раз пробуем прямой URL.
  if (url && !triedDirectFallback.value && resolvedAvatarSrc.value?.startsWith('blob:')) {
    triedDirectFallback.value = true
    invalidateAvatar(url)
    setResolvedSrc(url)
    return
  }

  imageError.value = true
  if (props.avatarUrl !== undefined || props.customAvatarUrl !== undefined) return
  if (isCurrentUser.value) {
    invalidateAvatar(url)
    await userStore.loadAvatar()
    imageError.value = false
    return
  }
  const id = normalizedUserId.value
  if (id !== null) {
    invalidateUserPublicInfo(id)
    try {
      loadedPublicInfo.value = await getUserPublicInfo(id)
      imageError.value = false
    } catch {
      // оставляем imageError true, покажется DefaultAvatar
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

// Фото накладывается поверх DefaultAvatar (инициалы), чтобы при перезагрузке
// не было резкой подмены «инициалы → фото». Фото плавно проявляется после load.
.user-avatar-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  opacity: 0;
  transition: opacity 0.2s ease;

  &.is-loaded {
    opacity: 1;
  }

  .user-avatar--clickable:hover & {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}
</style>
