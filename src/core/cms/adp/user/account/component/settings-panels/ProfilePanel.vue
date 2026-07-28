<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { Save } from 'lucide-vue-next'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useProfile } from '@/core/cms/js/profileService.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import AvatarBlock from './AvatarBlock.vue'
import UserProfileFields from './UserProfileFields.vue'
import {
  USER_PROFILE_MAIN_FIELDS,
  USER_PROFILE_ADDITIONAL_FIELDS,
  USER_PROFILE_SELF_EDITABLE_ADDITIONAL_FIELDS,
  USER_PROFILE_IDENTITY_FIELDS,
  mapUserProfileToFormData,
  buildUserProfilePayload,
  validateUserProfileData,
  applyProfileApiErrors,
} from '@/core/cms/adp/js/userProfileForm.js'
import { fetchProfileSettings } from '@/core/cms/adp/js/profileSettings.js'

const ProfileChangeRequestBlock = defineAsyncComponent(() =>
  import('./ProfileChangeRequestBlock.vue'),
)

const { t } = useAppI18n()
const toast = useToast()
const userStore = useUserStore()
const { updateProfile } = useProfile()

const loading = ref(true)
const savingMain = ref(false)
const savingAdditional = ref(false)
const profileData = ref(null)
const formData = ref({})
const errors = ref({})
const profileSelfEditEnabled = ref(true)

const identityReadonly = computed(() => profileSelfEditEnabled.value === false)

const fetchProfile = async () => {
  try {
    loading.value = true

    const settingsPromise = fetchProfileSettings()
    if (!userStore.isInitialized) {
      await userStore.ensureUserReady()
    }

    const [settings] = await Promise.all([
      settingsPromise,
      userStore.profile ? Promise.resolve() : userStore.loadProfile(),
      userStore.loadAvatar(),
    ])

    profileSelfEditEnabled.value = settings.profile_self_edit_enabled !== false

    if (userStore.profile) {
      profileData.value = userStore.profile
      formData.value = mapUserProfileToFormData(profileData.value)
    }
  } catch (error) {
    logError('Ошибка загрузки профиля:', error)
    toast.error(t('settings.profile.loadError'))
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
    const validation = validateUserProfileData(partialData)
    if (!validation.isValid) {
      errors.value = validation.errors
      return
    }

    await updateProfile(buildUserProfilePayload(formData.value, fields))
    await userStore.loadProfile(true)

    if (userStore.profile) {
      profileData.value = userStore.profile
      formData.value = mapUserProfileToFormData(userStore.profile)
    }

    toast.success(successMessage)
  } catch (error) {
    logError('Ошибка сохранения профиля:', error)

    if (!applyProfileApiErrors(error, errors)) {
      toast.error(error?.response?.data?.error || t('settings.profile.saveError'))
    }
  } finally {
    savingRef.value = false
  }
}

const saveMainProfile = () =>
  saveSection(USER_PROFILE_MAIN_FIELDS, savingMain, t('settings.profile.updated'))

const saveAdditionalInfo = () =>
  saveSection(
    identityReadonly.value
      ? USER_PROFILE_SELF_EDITABLE_ADDITIONAL_FIELDS
      : USER_PROFILE_ADDITIONAL_FIELDS,
    savingAdditional,
    t('settings.profile.additionalUpdated'),
  )

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="settings-panel">
    <h1 class="settings-panel__title">{{ t('settings.profile.title') }}</h1>

    <LoadingContentArea :loading="loading" min-height="8rem">
    <template v-if="profileData">
      <div class="profile-card">
        <AvatarBlock :saving="savingMain || savingAdditional" />

        <UserProfileFields
          :fields="USER_PROFILE_MAIN_FIELDS"
          v-model:form-data="formData"
          :errors="errors"
          id-prefix="profile"
          :readonly-fields="identityReadonly ? USER_PROFILE_IDENTITY_FIELDS : []"
        />

        <div v-if="!identityReadonly" class="profile-card__footer">
          <button
            type="button"
            class="btn btn-sm profile-card__save"
            :disabled="savingMain || savingAdditional || loading"
            @click="saveMainProfile"
          >
            <Save :size="16" class="profile-card__save-icon" />
            <span v-if="savingMain">{{ t('settings.profile.saving') }}</span>
            <span v-else>{{ t('common.save') }}</span>
          </button>
        </div>
      </div>

      <ProfileChangeRequestBlock v-if="identityReadonly" :profile-data="profileData" />

      <h1 class="settings-panel__title settings-panel__title--secondary">{{ t('settings.profile.additionalTitle') }}</h1>

      <div class="profile-card">
        <UserProfileFields
          :fields="identityReadonly ? USER_PROFILE_SELF_EDITABLE_ADDITIONAL_FIELDS : USER_PROFILE_ADDITIONAL_FIELDS"
          v-model:form-data="formData"
          :errors="errors"
          id-prefix="profile"
        />

        <div class="profile-card__footer">
          <button
            type="button"
            class="btn btn-sm profile-card__save"
            :disabled="savingMain || savingAdditional || loading"
            @click="saveAdditionalInfo"
          >
            <Save :size="16" class="profile-card__save-icon" />
            <span v-if="savingAdditional">{{ t('settings.profile.saving') }}</span>
            <span v-else>{{ t('common.save') }}</span>
          </button>
        </div>
      </div>
    </template>

    <div v-else class="profile-panel__empty text-center py-4">
      <p class="text-muted mb-3">{{ t('settings.profile.loadFailed') }}</p>
      <button type="button" class="btn btn-outline-primary btn-sm" @click="fetchProfile">
        {{ t('settings.profile.tryAgain') }}
      </button>
    </div>
    </LoadingContentArea>
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

.profile-card {
  width: 100%;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  overflow: hidden;
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
