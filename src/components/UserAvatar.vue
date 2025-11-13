<template>
  <div 
    class="user-avatar"
    :class="[
      `user-avatar--${size}`,
      { 'user-avatar--clickable': clickable }
    ]"
    :title="title"
  >
    <!-- Показываем загруженное изображение если есть -->
    <img 
      v-if="hasCustomAvatar"
      :src="displayAvatarUrl"
      :alt="title"
      class="user-avatar-image"
      @error="onImageError"
    />
    <!-- Показываем стандартный аватар если нет кастомного -->
    <DefaultAvatar 
      v-else
      :size="size"
      :clickable="clickable"
      :title="title"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import DefaultAvatar from './DefaultAvatar.vue'
import { getUserAvatar } from '@/js/userAvatar'

const userStore = useUserStore()

const props = defineProps({
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  clickable: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Пользователь'
  },
  // Опциональный URL аватара для переопределения
  customAvatarUrl: {
    type: [String, null],
    default: undefined
  },
  userId: {
    type: [Number, String, null],
    default: null
  }
})

const currentAvatarUrl = ref(null)
const imageError = ref(false)
let loadToken = 0

const normalizedUserId = computed(() => {
  if (props.userId === undefined || props.userId === null) {
    return null
  }
  const parsed = Number(props.userId)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return Math.trunc(parsed)
})

const storeAvatarForUser = computed(() => {
  const storeUserId = Number(userStore.user?.id ?? null)
  if (Number.isFinite(storeUserId) && normalizedUserId.value !== null) {
    if (storeUserId === normalizedUserId.value) {
      return userStore.avatarUrl || null
    }
    return null
  }
  return userStore.avatarUrl || null
})

const displayAvatarUrl = computed(() => {
  if (props.customAvatarUrl !== undefined) {
    return props.customAvatarUrl
  }
  if (currentAvatarUrl.value) {
    return currentAvatarUrl.value
  }
  return storeAvatarForUser.value
})

const hasCustomAvatar = computed(() => Boolean(displayAvatarUrl.value) && !imageError.value)

function resetImageError() {
  imageError.value = false
}

async function resolveAvatar() {
  loadToken += 1
  const currentToken = loadToken
  resetImageError()

  if (props.customAvatarUrl !== undefined) {
    currentAvatarUrl.value = props.customAvatarUrl || null
    return
  }

  const targetUserId = normalizedUserId.value

  if (targetUserId !== null) {
    if (storeAvatarForUser.value) {
      currentAvatarUrl.value = storeAvatarForUser.value
      return
    }

    try {
      const avatarUrl = await getUserAvatar(targetUserId)
      if (currentToken !== loadToken) {
        return
      }
      currentAvatarUrl.value = avatarUrl || null
    } catch (error) {
      if (currentToken !== loadToken) {
        return
      }
      console.error(`Ошибка загрузки аватара пользователя ${targetUserId}:`, error)
      currentAvatarUrl.value = null
    }
    return
  }

  currentAvatarUrl.value = userStore.avatarUrl || null
}

// Инициализируем пользователя при монтировании компонента
onMounted(async () => {
  if (!userStore.isInitialized) {
    await userStore.initializeUser()
  }
  await resolveAvatar()
})

watch(
  () => [props.customAvatarUrl, props.userId],
  () => {
    resolveAvatar()
  }
)

watch(
  () => userStore.avatarUrl,
  () => {
    if (props.customAvatarUrl === undefined) {
      resolveAvatar()
    }
  }
)

// Обработка ошибки загрузки изображения
const onImageError = () => {
  imageError.value = true
  currentAvatarUrl.value = null
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
  
  &--small {
    width: 32px;
    height: 32px;
  }
  
  &--medium {
    width: 40px;
    height: 40px;
  }
  
  &--large {
    width: 120px;
    height: 120px;
  }
  
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
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  
  .user-avatar--clickable:hover & {
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}
</style>
