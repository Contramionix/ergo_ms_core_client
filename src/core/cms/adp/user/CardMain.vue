<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { Briefcase, Calendar } from 'lucide-vue-next'
import { useUserStore } from '@/core/cms/js/userStore'
import UserAvatar from '@/components/UserAvatar.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'

const userStore = useUserStore()

function getAvatarSizeForViewport() {
  if (typeof window === 'undefined') {
    return 180
  }

  if (window.innerWidth <= 575) {
    return 120
  }

  if (window.innerWidth <= 992) {
    return 150
  }

  return 180
}

const profileData = ref(null)
const loading = ref(true)
const avatarSize = ref(getAvatarSizeForViewport())

const displayUserInfo = computed(() => {
  if (!profileData.value && !userStore.user) {
    return {
      username: 'Пользователь',
      profession: '',
      registration: 'Неизвестно',
    }
  }

  const profile = profileData.value

  return {
    username: profile?.fullName || userStore.fullName || 'Гость',
    profession: profile?.bio || '',
    registration: formatRegistrationDate(resolveRegistrationDateRaw()),
  }
})

function resolveRegistrationDateRaw() {
  const profile = profileData.value || userStore.profile
  return (
    userStore.user?.date_joined
    || profile?.dateJoined
    || null
  )
}

function formatRegistrationDate(dateString) {
  if (!dateString) return 'Неизвестно'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Неизвестно'

  const options = { year: 'numeric', month: 'long' }
  return date.toLocaleDateString('ru-RU', options)
}

async function fetchProfile({ showLoading = false } = {}) {
  try {
    if (showLoading) {
      loading.value = true
    }

    if (!userStore.isInitialized) {
      await userStore.ensureUserReady()
    }

    if (userStore.profile) {
      profileData.value = userStore.profile
      return
    }

    await userStore.loadProfile()

    if (userStore.profile) {
      profileData.value = userStore.profile
    }
  } catch (error) {
    logError('Ошибка загрузки профиля:', error)
    if (userStore.profile) {
      profileData.value = userStore.profile
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => userStore.profile,
  (newProfile) => {
    if (newProfile && !loading.value) {
      profileData.value = newProfile
    }
  },
  { deep: true },
)

const refreshData = async () => {
  await fetchProfile({ showLoading: !profileData.value })
}

watch(
  () => userStore.user,
  async (newUser, oldUser) => {
    if (newUser && (!oldUser || newUser.id !== oldUser.id)) {
      await refreshData()
    }
  },
)

function updateAvatarSize() {
  avatarSize.value = getAvatarSizeForViewport()
}

onMounted(async () => {
  window.addEventListener('resize', updateAvatarSize)

  if (userStore.profile) {
    profileData.value = userStore.profile
  }

  await fetchProfile({ showLoading: !profileData.value && !userStore.user })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateAvatarSize)
})

defineExpose({
  refreshData,
})
</script>

<template>
  <div class="profile-card col-12">
    <div class="profile-card__cover">
      <img src="@/core/cms/assets/profile-cover.png" alt="Profile Cover" />
    </div>

    <LoadingContentArea :loading="loading" min-height="8rem">
      <div class="profile-card__body">
        <div class="profile-card__avatar">
          <UserAvatar
            :size="avatarSize"
            :title="displayUserInfo.username"
            :first-name="userStore.user?.first_name ?? userStore.profile?.firstName ?? null"
            :last-name="userStore.user?.last_name ?? userStore.profile?.lastName ?? null"
          />
        </div>

        <div class="profile-card__info">
          <h3 class="profile-card__username">
            {{ displayUserInfo.username }}
          </h3>

          <ul class="profile-card__meta list-unstyled mb-0">
            <li v-if="displayUserInfo.profession" class="profile-card__meta-item">
              <Briefcase :size="20" class="profile-card__meta-icon" />
              <span class="profile-card__meta-value">{{ displayUserInfo.profession }}</span>
            </li>
            <li class="profile-card__meta-item profile-card__meta-item--inline">
              <span class="profile-card__meta-part">
                <Calendar :size="20" class="profile-card__meta-icon" />
                <span class="profile-card__meta-label">На платформе с:</span>
                <span class="profile-card__meta-value">{{ displayUserInfo.registration }}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </LoadingContentArea>
  </div>
</template>

<style scoped lang="scss">
.profile-card {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  background: var(--color-primary-background);
}

.profile-card__cover {
  overflow: hidden;

  img {
    display: block;
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  @media (width <= 992px) {
    img {
      height: 180px;
    }
  }

  @media (width <= 575px) {
    img {
      height: 120px;
    }
  }
}

.profile-card__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1.5rem 1.5rem;
  text-align: center;
}

.profile-card__avatar {
  --profile-avatar-size: 180px;
  width: var(--profile-avatar-size);
  height: var(--profile-avatar-size);
  margin-top: calc(var(--profile-avatar-size) / -2);
  margin-bottom: 1rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 0 4px var(--color-primary-background);

  :deep(.user-avatar-wrap),
  :deep(.user-avatar) {
    width: 100% !important;
    height: 100% !important;
  }

  @media (width <= 992px) {
    --profile-avatar-size: 150px;
  }

  @media (width <= 575px) {
    --profile-avatar-size: 120px;
  }
}

.profile-card__info {
  width: 100%;
  max-width: 42rem;
}

.profile-card__username {
  margin: 0 0 0.75rem;
  min-height: 2.25rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.profile-card__meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0 auto;
  max-width: 100%;
}

.profile-card__meta-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-size: 0.9375rem;
  text-align: center;

  &--inline {
    flex-wrap: wrap;
    gap: 0.5rem 0.875rem;
  }
}

.profile-card__meta-part {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
}

.profile-card__meta-label {
  color: var(--color-primary-text);
  font-weight: 500;
}

.profile-card__meta-value {
  color: var(--color-secondary-text);
}

.profile-card__meta-divider {
  align-self: center;
  color: var(--color-secondary-text);
  opacity: 0.5;
  user-select: none;
}

.profile-card__meta-icon {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-primary-text);
}
</style>
