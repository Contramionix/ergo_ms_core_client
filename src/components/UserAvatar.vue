<template>
  <div class="user-avatar" :class="{ 'user-avatar--clickable': clickable }" :style="avatarStyle" :title="title">
    <img v-if="hasCustomAvatar" :src="displayAvatarUrl" :alt="title" class="user-avatar-image" @error="onImageError" />
    <DefaultAvatar v-else :size="size" :clickable="clickable" :title="title" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import DefaultAvatar from './DefaultAvatar.vue'
import { getUserAvatar, invalidateUserAvatar } from '@/js/userAvatar'

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
  }
})

const loadedAvatarUrl = ref(null)
const imageError = ref(false)

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`
}))

// Нормализуем userId к числу или null
const normalizedUserId = computed(() => {
  if (props.userId == null) return null
  const parsed = Number(props.userId)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
})

// Определяем, является ли userId текущим пользователем
const isCurrentUser = computed(() => {
  if (normalizedUserId.value === null) return true
  const storeUserId = Number(userStore.user?.id)
  return Number.isFinite(storeUserId) && storeUserId === normalizedUserId.value
})

// Единая логика определения URL аватара
const displayAvatarUrl = computed(() => {
  // Приоритет 1: явно переданный avatarUrl
  if (props.avatarUrl !== undefined) return props.avatarUrl
  
  // Приоритет 2: customAvatarUrl (обратная совместимость)
  if (props.customAvatarUrl !== undefined) return props.customAvatarUrl
  
  // Приоритет 3: загруженный через API
  if (loadedAvatarUrl.value) return loadedAvatarUrl.value
  
  // Приоритет 4: из store (только для текущего пользователя)
  if (isCurrentUser.value) return userStore.avatarUrl || null
  
  return null
})

const hasCustomAvatar = computed(() => Boolean(displayAvatarUrl.value) && !imageError.value)

async function loadAvatar() {
  imageError.value = false
  
  // Если URL передан явно, не делаем запросы
  if (props.avatarUrl !== undefined || props.customAvatarUrl !== undefined) {
    loadedAvatarUrl.value = null
    return
  }
  
  // Если это текущий пользователь и есть аватар в store, используем его
  if (isCurrentUser.value && userStore.avatarUrl) {
    loadedAvatarUrl.value = null
    return
  }
  
  // Загружаем аватар через API только если передан userId
  if (normalizedUserId.value !== null) {
    try {
      const avatarUrl = await getUserAvatar(normalizedUserId.value)
      loadedAvatarUrl.value = avatarUrl || null
    } catch (error) {
      console.error(`Ошибка загрузки аватара пользователя ${normalizedUserId.value}:`, error)
      loadedAvatarUrl.value = null
    }
  } else {
    loadedAvatarUrl.value = null
  }
}

onMounted(async () => {
  if (!userStore.isInitialized) {
    await userStore.initializeUser()
  }
  await loadAvatar()
})

// Перезагружаем при изменении пропсов
watch(
  () => [props.avatarUrl, props.customAvatarUrl, props.userId],
  loadAvatar
)

// Обновляем при изменении аватара в store (только если не передан явный URL)
watch(
  () => userStore.avatarUrl,
  () => {
    if (props.avatarUrl === undefined && props.customAvatarUrl === undefined) {
      loadAvatar()
    }
  }
)

async function onImageError() {
  imageError.value = true
  loadedAvatarUrl.value = null
  if (props.avatarUrl !== undefined || props.customAvatarUrl !== undefined) return
  if (isCurrentUser.value) {
    await userStore.loadAvatar()
    imageError.value = false
    return
  }
  if (normalizedUserId.value !== null) {
    invalidateUserAvatar(normalizedUserId.value)
    try {
      const fresh = await getUserAvatar(normalizedUserId.value)
      loadedAvatarUrl.value = fresh || null
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
