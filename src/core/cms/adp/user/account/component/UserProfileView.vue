<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import {
  USER_PROFILE_MAIN_FIELDS,
  USER_PROFILE_ADDITIONAL_FIELDS,
  mapUserProfileToFormData,
} from '@/core/cms/adp/js/userProfileForm.js'

const FIELD_LABELS = {
  email: 'Email',
  first_name: 'Имя',
  last_name: 'Фамилия',
  middle_name: 'Отчество',
  phone: 'Телефон',
  bio: 'О себе',
}

const userStore = useUserStore()
const loading = ref(true)
const profileData = ref(null)

const formData = computed(() => mapUserProfileToFormData(profileData.value))

function displayValue(field) {
  const value = formData.value[field]
  if (value == null || String(value).trim() === '') {
    return 'Не указано'
  }
  return String(value).trim()
}

function isEmpty(field) {
  const value = formData.value[field]
  return value == null || String(value).trim() === ''
}

function buildSection(fields) {
  return fields
    .filter((field) => FIELD_LABELS[field])
    .map((field) => ({
      key: field,
      label: FIELD_LABELS[field],
      value: displayValue(field),
      empty: isEmpty(field),
    }))
}

const mainSection = computed(() => buildSection(USER_PROFILE_MAIN_FIELDS))
const additionalSection = computed(() =>
  buildSection(USER_PROFILE_ADDITIONAL_FIELDS.filter((field) => field !== 'bio')),
)
const bioText = computed(() => displayValue('bio'))
const hasBio = computed(() => !isEmpty('bio'))

async function fetchProfile() {
  try {
    loading.value = true

    if (!userStore.isInitialized) {
      await userStore.ensureUserReady()
    }

    if (userStore.profile) {
      profileData.value = userStore.profile
    } else {
      await userStore.loadProfile()
      profileData.value = userStore.profile
    }
  } catch (error) {
    logError('Ошибка загрузки профиля:', error)
    profileData.value = userStore.profile ?? null
  } finally {
    loading.value = false
  }
}

watch(
  () => userStore.profile,
  (newProfile) => {
    if (newProfile) {
      profileData.value = newProfile
    }
  },
  { deep: true },
)

onMounted(fetchProfile)
</script>

<template>
  <div class="user-profile-view">
    <LoadingContentArea :loading="loading" min-height="8rem">
    <div v-if="profileData" class="user-profile-view__content">
      <section class="user-profile-view__section">
        <h2 class="user-profile-view__section-title">Основная информация</h2>
        <dl class="user-profile-view__grid">
          <div v-for="item in mainSection" :key="item.key" class="user-profile-view__item">
            <dt class="user-profile-view__label">{{ item.label }}</dt>
            <dd class="user-profile-view__value" :class="{ 'user-profile-view__value--empty': item.empty }">
              {{ item.value }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="user-profile-view__section">
        <h2 class="user-profile-view__section-title">Контакты</h2>
        <dl class="user-profile-view__grid">
          <div v-for="item in additionalSection" :key="item.key" class="user-profile-view__item">
            <dt class="user-profile-view__label">{{ item.label }}</dt>
            <dd class="user-profile-view__value" :class="{ 'user-profile-view__value--empty': item.empty }">
              {{ item.value }}
            </dd>
          </div>
        </dl>
      </section>

      <section v-if="hasBio" class="user-profile-view__section">
        <h2 class="user-profile-view__section-title">О себе</h2>
        <p class="user-profile-view__bio">{{ bioText }}</p>
      </section>
    </div>

    <div v-else class="user-profile-view__empty text-center py-4">
      <p class="text-muted mb-3">Не удалось загрузить данные профиля</p>
      <button type="button" class="btn btn-outline-primary btn-sm" @click="fetchProfile">
        Попробовать снова
      </button>
    </div>
    </LoadingContentArea>
  </div>
</template>

<style scoped lang="scss">
.user-profile-view {
  width: 100%;
}

.user-profile-view__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.user-profile-view__section {
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  padding: 1.25rem;
}

.user-profile-view__section-title {
  margin: 0 0 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.user-profile-view__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem 1.5rem;
  margin: 0;

  @media (width < $ui-bp-md) {
    grid-template-columns: 1fr;
  }
}

.user-profile-view__item {
  min-width: 0;
}

.user-profile-view__label {
  margin: 0 0 0.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-secondary-text);
}

.user-profile-view__value {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--color-primary-text);
  word-break: break-word;

  &--empty {
    color: var(--color-secondary-text);
    font-style: italic;
  }
}

.user-profile-view__bio {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--color-primary-text);
  white-space: pre-wrap;
}
</style>
