<template>
  <div class="user-avatar" :class="{ 'user-avatar--clickable': clickable }" :style="avatarStyle" :title="title">
    <img v-if="hasCustomAvatar" :src="displayAvatarUrl" :alt="title" class="user-avatar-image" @error="onImageError" />
    <DefaultAvatar v-else :size="size" :clickable="clickable" :title="title" :first-name="effectiveFirstName" :last-name="effectiveLastName"/>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import DefaultAvatar from './DefaultAvatar.vue'
import { getUserPublicInfo, getCachedUserPublicInfo, invalidateUserPublicInfo, } from '@/js/userAvatar'

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
  }
})

const loadedPublicInfo = ref(null)
const imageError = ref(false)

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

const hasCustomAvatar = computed(() => Boolean(displayAvatarUrl.value) && !imageError.value)

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
  imageError.value = true
  if (props.avatarUrl !== undefined || props.customAvatarUrl !== undefined) return
  if (isCurrentUser.value) {
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
.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  transition: all 0.2s ease;
  user-select: none;
  flex-shrink: 0;
  
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
  transition: all 0.2s ease;
  
  .user-avatar--clickable:hover & {
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}
</style>