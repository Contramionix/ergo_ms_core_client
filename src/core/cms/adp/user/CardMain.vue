<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { Briefcase, Calendar, Settings, Shield } from 'lucide-vue-next'
import { useUserStore } from '@/core/cms/js/userStore'
import UserAvatar from '@/components/UserAvatar.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { formatMonthYearGenitive } from '@/js/utils/timeUtils.js'
import { logError } from '@/js/utils/logError.js'

const userStore = useUserStore()

function getAvatarSizeForViewport() {
  if (typeof window === 'undefined') {
    return 96
  }
  if (window.innerWidth <= 575) {
    return 72
  }
  if (window.innerWidth <= 992) {
    return 80
  }
  return 96
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
      role: '',
    }
  }

  const profile = profileData.value

  return {
    username: profile?.fullName || userStore.fullName || 'Гость',
    profession: profile?.bio || '',
    registration: formatRegistrationDate(resolveRegistrationDateRaw()),
    role: userStore.userRole || '',
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

  const label = formatMonthYearGenitive(dateString)
  return label || 'Неизвестно'
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

function openProfileSettings() {
  window.dispatchEvent(new CustomEvent('ergo:open-user-settings', {
    detail: { tab: 'profile' },
  }))
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
    <div class="profile-card__cover" aria-hidden="true">
      <div class="profile-card__cover-gleam" />
    </div>

    <LoadingContentArea :loading="loading" min-height="6rem">
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
          <div class="profile-card__title-row">
            <h3 class="profile-card__username">
              {{ displayUserInfo.username }}
            </h3>
            <HoverTooltip text="Настройки профиля">
              <button
                type="button"
                class="profile-card__settings"
                aria-label="Настройки профиля"
                @click="openProfileSettings"
              >
                <Settings :size="16" aria-hidden="true" />
              </button>
            </HoverTooltip>
          </div>

          <div v-if="displayUserInfo.role" class="profile-card__chips">
            <span class="profile-card__chip profile-card__chip--role">
              <Shield :size="12" aria-hidden="true" />
              {{ displayUserInfo.role }}
            </span>
          </div>

          <ul class="profile-card__meta list-unstyled mb-0">
            <li v-if="displayUserInfo.profession" class="profile-card__meta-item">
              <Briefcase :size="14" class="profile-card__meta-icon" />
              <span class="profile-card__meta-value">{{ displayUserInfo.profession }}</span>
            </li>
            <li class="profile-card__meta-item">
              <Calendar :size="14" class="profile-card__meta-icon" />
              <span class="profile-card__meta-label">На платформе с</span>
              <span class="profile-card__meta-value">{{ displayUserInfo.registration }}</span>
            </li>
          </ul>
        </div>
      </div>
    </LoadingContentArea>
  </div>
</template>

<style scoped lang="scss">
.profile-card {
  --profile-cover-h: 72px;
  --profile-overlap: 36px;
  --profile-card-shadow: 0 2px 12px color-mix(in srgb, var(--color-primary-text) 6%, transparent);
  --profile-card-shadow-hover: 0 8px 22px color-mix(in srgb, var(--color-primary-text) 12%, transparent);
  overflow: hidden;
  border: 1px solid var(--ui-border, var(--color-border));
  border-radius: 0.625rem;
  background: var(--ui-surface, var(--color-primary-background));
  box-shadow: var(--profile-card-shadow);
  /* Только opacity — transform оставлен для soft lift на hover */
  animation: profile-card-fade 0.25s ease-out backwards;
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--profile-card-shadow-hover);
  }

  @media (width <= 992px) {
    --profile-cover-h: 68px;
    --profile-overlap: 32px;
  }

  @media (width <= 575px) {
    --profile-cover-h: 60px;
    --profile-overlap: 28px;
  }
}

.profile-card__cover {
  position: relative;
  height: var(--profile-cover-h);
  overflow: hidden;
  /* Тон самой карточки (surface-2), чуть темнее белого тела — полоса читается как
     часть карточки, а не отдельный баннер, независимо от акцента активной темы */
  background: var(--ui-surface-2, var(--color-secondary-background));
  border-bottom: 1px solid var(--ui-border, var(--color-border));
}

.profile-card__cover-gleam {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  transform-origin: 88% 0%;
  background: radial-gradient(
    70% 130% at 88% 0%,
    color-mix(in srgb, var(--color-accent, var(--bs-primary)) 16%, transparent),
    transparent 60%
  );
  opacity: 0.85;
  animation: profile-cover-bloom 0.35s ease-out 0.08s backwards;
  transition: opacity 0.2s ease;

  .profile-card:hover & {
    opacity: 1;
  }
}

@keyframes profile-card-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes profile-cover-bloom {
  from {
    opacity: 0;
    transform: scale(0.72);
  }

  to {
    opacity: 0.85;
    transform: scale(1);
  }
}

@keyframes profile-reveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.profile-card__body {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0 1.25rem 1.15rem;
  margin-top: calc(var(--profile-overlap) * -1);
}

.profile-card__avatar {
  --profile-avatar-size: 96px;
  width: var(--profile-avatar-size);
  height: var(--profile-avatar-size);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  box-shadow:
    0 0 0 3px var(--ui-surface, var(--color-primary-background)),
    0 6px 16px color-mix(in srgb, var(--color-primary-text) 12%, transparent);
  background: var(--ui-surface, var(--color-primary-background));
  animation: profile-reveal 0.28s ease-out backwards;

  :deep(.user-avatar-wrap),
  :deep(.user-avatar) {
    width: 100% !important;
    height: 100% !important;
  }

  @media (width <= 992px) {
    --profile-avatar-size: 80px;
  }

  @media (width <= 575px) {
    --profile-avatar-size: 72px;
  }
}

.profile-card__info {
  flex: 1 1 auto;
  min-width: 0;
  /* Имя и чипы только на светлом теле — ниже края cover */
  padding-top: calc(var(--profile-cover-h) - var(--profile-overlap) + 0.5rem);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.profile-card__title-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem;
  min-width: 0;
  animation: profile-reveal 0.28s ease-out 0.05s backwards;
}

.profile-card__username {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-primary-text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-card__settings {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: color-mix(in srgb, var(--color-primary-text) 58%, transparent);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background-color: var(--ui-surface-2, var(--color-secondary-background));
    color: var(--color-primary-text);
    border-color: var(--ui-border, var(--color-border));
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}

.profile-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  animation: profile-reveal 0.28s ease-out 0.1s backwards;
}

.profile-card__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--ui-border, var(--color-border));
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &--role {
    color: var(--bs-primary-text-emphasis, var(--color-primary-text));
    background-color: var(--bs-primary-bg-subtle, var(--ui-surface-2));
    border-color: var(--bs-primary-border-subtle, var(--ui-border));
  }
}

.profile-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.85rem;
  margin: 0;
  animation: profile-reveal 0.28s ease-out 0.15s backwards;
}

.profile-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.875rem;
  min-width: 0;
  color: color-mix(in srgb, var(--color-primary-text) 70%, transparent);
}

.profile-card__meta-label {
  font-weight: 550;
}

.profile-card__meta-value {
  font-weight: 500;
}

.profile-card__meta-icon {
  flex-shrink: 0;
  color: color-mix(in srgb, var(--color-primary-text) 65%, transparent);
}

@media (width <= 575px) {
  .profile-card__body {
    flex-direction: column;
    align-items: stretch;
    gap: 0.65rem;
    padding: 0 1rem 1rem;
  }

  .profile-card__avatar {
    align-self: flex-start;
  }

  .profile-card__info {
    padding-top: 0.35rem;
  }

  .profile-card__title-row {
    flex-wrap: wrap;
  }

  .profile-card__username {
    font-size: 1.15rem;
    white-space: normal;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-card {
    animation: none;
    transition: none;

    &:hover {
      transform: none;
      box-shadow: var(--profile-card-shadow);
    }
  }

  .profile-card__cover-gleam {
    animation: none;
    opacity: 0.85;
    transform: none;
    transition: none;
  }

  .profile-card__avatar,
  .profile-card__title-row,
  .profile-card__chips,
  .profile-card__meta {
    animation: none;
  }
}
</style>
