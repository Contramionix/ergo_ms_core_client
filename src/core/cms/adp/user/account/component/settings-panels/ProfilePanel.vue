<script setup>
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { Save } from 'lucide-vue-next'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import { useProfile } from '@/core/cms/js/profileService.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import AvatarBlock from './AvatarBlock.vue'
import { logError } from '@/js/utils/logError.js'

const toast = useToast()
const userStore = useUserStore()
const { updateProfile, validateProfileData } = useProfile()

const loading = ref(true)
const savingMain = ref(false)
const savingAdditional = ref(false)
const profileData = ref(null)
const formData = ref({})
const errors = ref({})

const BIO_MAX_LENGTH = 500
const MAIN_FIELDS = ['first_name', 'last_name', 'middle_name']
const ADDITIONAL_FIELDS = ['website', 'country', 'city', 'bio']

const normalizeEmptyString = (value) => {
  return value === ' ' ? '' : (value || '')
}

const initializeFormData = (profile) => {
  if (!profile) return {}

  return {
    first_name: normalizeEmptyString(profile.firstName),
    last_name: normalizeEmptyString(profile.lastName),
    middle_name: normalizeEmptyString(profile.middleName),
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    bio: profile.bio,
    country: profile.country,
    city: profile.city,
    language: profile.language,
  }
}

const emailDisplay = computed(() => {
  const raw = formData.value?.email ?? profileData.value?.email
  if (raw) return raw
  return 'Не указан'
})

const bioCharCount = computed(() => (formData.value.bio || '').length)

const fetchProfile = async () => {
  try {
    loading.value = true

    if (!userStore.isInitialized) {
      await userStore.initializeUser()
    }

    if (userStore.profile) {
      profileData.value = userStore.profile
    } else {
      await userStore.loadProfile()
      if (userStore.profile) {
        profileData.value = userStore.profile
      }
    }

    if (profileData.value) {
      formData.value = initializeFormData(profileData.value)
    }

    await userStore.loadAvatar()
  } catch (error) {
    logError('Ошибка загрузки профиля:', error)
    toast.error('Ошибка загрузки данных профиля')
    profileData.value = null
  } finally {
    loading.value = false
  }
}

const saveSection = async (fields, savingRef, successMessage) => {
  try {
    savingRef.value = true
    errors.value = {}

    const partialData = Object.fromEntries(fields.map((field) => [field, formData.value[field]]))
    const validation = validateProfileData(partialData)
    if (!validation.isValid) {
      errors.value = validation.errors
      return
    }

    const dataToSend = Object.fromEntries(
      fields.map((field) => [field, formData.value[field]?.trim() || '']),
    )

    await updateProfile(dataToSend)
    await userStore.loadProfile(true)

    if (userStore.profile) {
      profileData.value = userStore.profile
      formData.value = initializeFormData(userStore.profile)
    }

    toast.success(successMessage)
  } catch (error) {
    logError('Ошибка сохранения профиля:', error)

    if (error.response?.data) {
      errors.value = error.response.data
    } else {
      toast.error('Ошибка сохранения профиля')
    }
  } finally {
    savingRef.value = false
  }
}

const saveMainProfile = () => saveSection(MAIN_FIELDS, savingMain, 'Профиль успешно обновлен')

const saveAdditionalInfo = () =>
  saveSection(ADDITIONAL_FIELDS, savingAdditional, 'Дополнительная информация успешно обновлена')

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="settings-panel">
    <h1 class="settings-panel__title">Профиль</h1>

    <div v-if="loading" class="profile-panel__loading">
      <SpinnerLoading color="primary" />
    </div>

    <template v-else-if="profileData">
    <div class="profile-card">
      <AvatarBlock :saving="savingMain" />

      <div class="profile-card__row">
        <span class="profile-card__label">Email</span>
        <span class="profile-card__value profile-card__value--static profile-card__value--email text-truncate" :title="emailDisplay">
          {{ emailDisplay }}
        </span>
      </div>

      <div class="profile-card__row">
        <label class="profile-card__label" for="profile-last-name">Фамилия</label>
        <div class="profile-card__control">
          <input id="profile-last-name" v-model="formData.last_name" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.last_name }" autocomplete="family-name" placeholder="Введите фамилию"/>
          <div v-if="errors.last_name" class="invalid-feedback d-block">
            {{ errors.last_name }}
          </div>
        </div>
      </div>

      <div class="profile-card__row">
        <label class="profile-card__label" for="profile-first-name">Имя</label>
        <div class="profile-card__control">
          <input id="profile-first-name" v-model="formData.first_name" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.first_name }" autocomplete="given-name" placeholder="Введите имя"/>
          <div v-if="errors.first_name" class="invalid-feedback d-block">
            {{ errors.first_name }}
          </div>
        </div>
      </div>

      <div class="profile-card__row profile-card__row--last">
        <label class="profile-card__label" for="profile-middle-name">Отчество</label>
        <div class="profile-card__control">
          <input id="profile-middle-name" v-model="formData.middle_name" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.middle_name }" autocomplete="additional-name" placeholder="Введите отчество"/>
          <div v-if="errors.middle_name" class="invalid-feedback d-block">
            {{ errors.middle_name }}
          </div>
        </div>
      </div>

      <div class="profile-card__footer">
        <button type="button" class="btn btn-sm profile-card__save" :disabled="savingMain || loading" @click="saveMainProfile">
          <Save :size="16" class="profile-card__save-icon" />
          <span v-if="savingMain">Сохранение...</span>
          <span v-else>Сохранить</span>
        </button>
      </div>
    </div>

    <h1 class="settings-panel__title settings-panel__title--secondary">Дополнительная информация</h1>

    <div class="profile-card">
      <div class="profile-card__row">
        <label class="profile-card__label" for="profile-website">Веб-сайт</label>
        <div class="profile-card__control">
          <input id="profile-website" v-model="formData.website" type="url" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.website }" autocomplete="url" placeholder="https://example.com"/>
          <div v-if="errors.website" class="invalid-feedback d-block">
            {{ errors.website }}
          </div>
        </div>
      </div>

      <div class="profile-card__row">
        <label class="profile-card__label" for="profile-country">Страна</label>
        <div class="profile-card__control">
          <input id="profile-country" v-model="formData.country" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.country }" autocomplete="country-name" placeholder="Введите страну"/>
          <div v-if="errors.country" class="invalid-feedback d-block">
            {{ errors.country }}
          </div>
        </div>
      </div>

      <div class="profile-card__row">
        <label class="profile-card__label" for="profile-city">Город</label>
        <div class="profile-card__control">
          <input id="profile-city" v-model="formData.city" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.city }" autocomplete="address-level2" placeholder="Введите город"/>
          <div v-if="errors.city" class="invalid-feedback d-block">
            {{ errors.city }}
          </div>
        </div>
      </div>

      <div class="profile-card__row profile-card__row--last">
        <label class="profile-card__label" for="profile-bio">О себе</label>
        <div class="profile-card__control">
          <textarea id="profile-bio" v-model="formData.bio" rows="4" :maxlength="BIO_MAX_LENGTH" class="form-control form-control-sm profile-card__input profile-card__textarea" :class="{ 'is-invalid': errors.bio }" placeholder="Расскажите о себе"/>
          <div class="profile-card__char-counter" :class="{ 'profile-card__char-counter--limit': bioCharCount >= BIO_MAX_LENGTH }">
            {{ bioCharCount }}/{{ BIO_MAX_LENGTH }}
          </div>
          <div v-if="errors.bio" class="invalid-feedback d-block">
            {{ errors.bio }}
          </div>
        </div>
      </div>

      <div class="profile-card__footer">
        <button type="button" class="btn btn-sm profile-card__save" :disabled="savingAdditional || loading" @click="saveAdditionalInfo">
          <Save :size="16" class="profile-card__save-icon" />
          <span v-if="savingAdditional">Сохранение...</span>
          <span v-else>Сохранить</span>
        </button>
      </div>
    </div>
    </template>

    <div v-else class="profile-panel__empty text-center py-4">
      <p class="text-muted mb-3">Не удалось загрузить данные профиля</p>
      <button type="button" class="btn btn-outline-primary btn-sm" @click="fetchProfile">
        Попробовать снова
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings-panel {
  width: 100%;
}

.settings-panel__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin-bottom: 0.75rem;
}

.settings-panel__title--secondary {
  margin-top: 1.25rem;
}

.profile-panel__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 8rem;
  border-radius: 0.625rem;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
}

.profile-card {
  width: 100%;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  overflow: hidden;
}

.profile-card__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);

  @media (max-width: 575.98px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
}

.profile-card__row--last {
  border-bottom: none;
}

.profile-card__label {
  flex: 0 0 auto;
  min-width: 6.5rem;
  padding-top: 0.35rem;
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  margin: 0;
}

.profile-card__value {
  flex: 1 1 auto;
  text-align: right;
  font-size: 0.9375rem;
  color: var(--color-primary-text);
}

.profile-card__value--static {
  padding-top: 0.35rem;
}

.profile-card__value--email {
  text-align: left;
}

.profile-card__control {
  flex: 1 1 60%;
  min-width: 0;
}

.profile-card__input {
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border-width: 1px;
  border-style: solid;
  border-color: var(--color-border);
  box-shadow: none;
  transition:
    background-color 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.28s cubic-bezier(0.4, 0, 0.2, 1);

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.01ms;
  }

  &::placeholder {
    color: var(--color-secondary-text);
    opacity: 0.75;
  }

  &:focus,
  &:focus-visible {
    outline: none;
    background: var(--color-hover-background);
    color: var(--color-primary-text);
    border-color: var(--color-border);
    box-shadow: none;
  }
}

.profile-card__textarea {
  resize: vertical;
  min-height: 5.5rem;
  line-height: 1.4;
  font-family: inherit;
}

.profile-card__char-counter {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-secondary-text);
  text-align: right;
}

.profile-card__char-counter--limit {
  color: var(--bs-danger, #dc3545);
}

.profile-card__footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1rem 1rem;
  background: var(--color-primary-background);
}

.profile-card__save {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: 1px solid var(--color-border);

  &:hover:not(:disabled) {
    background: var(--color-secondary-background);
    color: var(--color-primary-text);
  }

  &:disabled {
    opacity: 0.65;
  }
}

.profile-card__save-icon {
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
