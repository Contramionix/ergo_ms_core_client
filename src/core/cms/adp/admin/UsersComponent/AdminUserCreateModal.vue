<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, computed, watch } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import ModalCenter from '@/components/ModalCenter.vue'
import UserProfileFields from '@/core/cms/adp/user/account/component/settings-panels/UserProfileFields.vue'
import { createAdminUser } from '@/core/cms/adp/admin/js/adminUserService.js'
import { tGlobal } from '@/i18n/index.js'
import {
  USER_PROFILE_MAIN_FIELDS,
  buildUserProfilePayload,
  applyProfileApiErrors,
} from '@/core/cms/adp/js/userProfileForm.js'
import { validatePasswordValue } from '@/js/passwordPolicy.js'
import SelectBox from '@/components/SelectBox.vue'
import { mapRoleSelectOptions, mapRoleGroupSelectOptions } from '@/core/cms/js/adminSelectOptions.js'

const { t } = useAppI18n()

const props = defineProps({
  show: { type: Boolean, default: false },
  roles: { type: Array, default: () => [] },
  roleGroups: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:show', 'created'])

const toast = useToast()
const roleSelectOptions = computed(() => mapRoleSelectOptions(props.roles))
const roleGroupSelectOptions = computed(() => mapRoleGroupSelectOptions(props.roleGroups))
const PROFILE_FIELDS = USER_PROFILE_MAIN_FIELDS

const saving = ref(false)
const errors = ref({})
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const formData = ref({
  email: '',
  first_name: '',
  last_name: '',
  middle_name: '',
})
const selectedRoleId = ref(null)
const selectedGroupIds = ref([])
const sendPasswordNotification = ref(true)

const useManualPassword = computed(() => Boolean(password.value || confirmPassword.value))
const canSendNotification = computed(
  () => !useManualPassword.value && Boolean((formData.value.email || '').trim()),
)

const resetState = () => {
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
  formData.value = {
    email: '',
    first_name: '',
    last_name: '',
    middle_name: '',
  }
  selectedRoleId.value = null
  selectedGroupIds.value = []
  sendPasswordNotification.value = true
  errors.value = {}
}

watch(
  () => props.show,
  (isOpen) => {
    if (!isOpen) {
      resetState()
    }
  },
)

const handleClose = () => {
  emit('update:show', false)
}

const validateForm = () => {
  const nextErrors = {}
  const login = username.value.trim()
  if (!login) {
    nextErrors.username = tGlobal('admin.users.usernameRequired')
  }

  if (password.value || confirmPassword.value) {
    if (!password.value) {
      nextErrors.password = tGlobal('admin.users.passwordRequired')
    } else if (!confirmPassword.value) {
      nextErrors.confirm_password = tGlobal('admin.users.confirmPasswordRequired')
    } else if (password.value !== confirmPassword.value) {
      nextErrors.confirm_password = tGlobal('admin.users.passwordsMismatch')
    } else {
      const complexityError = validatePasswordValue(password.value)
      if (complexityError) {
        nextErrors.password = complexityError
      }
    }
  }

  const email = (formData.value.email || '').trim()
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    nextErrors.email = tGlobal('admin.users.emailInvalid')
  }

  errors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

const handleCreate = async () => {
  if (!validateForm()) {
    return
  }

  saving.value = true
  errors.value = {}

  try {
    const profilePayload = buildUserProfilePayload(formData.value, PROFILE_FIELDS)
    const payload = {
      username: username.value.trim(),
      ...profilePayload,
      send_password_notification: canSendNotification.value && sendPasswordNotification.value,
    }

    if (useManualPassword.value) {
      payload.password = password.value
      payload.confirm_password = confirmPassword.value
    }

    if (selectedRoleId.value) {
      payload.role_id = Number(selectedRoleId.value)
      payload.role_group_ids = selectedGroupIds.value.map(Number)
    }

    const createdUser = await createAdminUser(payload)

    let message = tGlobal('admin.users.created', { username: createdUser.username })
    if (createdUser.password_mode === 'system') {
      if (createdUser.email_sent) {
        message += tGlobal('admin.users.createdEmailSent')
      } else if (createdUser.email_warning) {
        message += tGlobal('admin.users.createdEmailFailed')
      } else {
        message += tGlobal('admin.users.createdPasswordGenerated')
      }
    }

    toast.success(message)
    emit('created', createdUser)
    handleClose()
  } catch (error) {
    logError('Ошибка создания пользователя:', error)
    if (!applyProfileApiErrors(error, errors)) {
      const message = error.response?.data?.error || tGlobal('admin.users.createFailed')
      toast.error(message)
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalCenter
    modal-id="adminUserCreate"
    standalone
    :visible="show"
    :title="t('admin.users.newUser')"
    size="lg"
    scrollable
    @closemodal="handleClose"
  >
    <p class="admin-user-create__hint">
      {{ t('admin.users.createHint') }}
    </p>

    <h2 class="admin-user-create__section-title">{{ t('admin.users.credentials') }}</h2>
    <div class="profile-card">
      <div class="profile-card__row">
        <label class="profile-card__label" for="admin-create-username">{{ t('admin.users.loginLabel') }}</label>
        <div class="profile-card__control">
          <input
            id="admin-create-username"
            v-model="username"
            type="text"
            class="form-control form-control-sm profile-card__input"
            autocomplete="off"
            placeholder="username"
            :class="{ 'is-invalid': errors.username }"
          />
          <div v-if="errors.username" class="invalid-feedback d-block">{{ errors.username }}</div>
        </div>
      </div>

      <div class="profile-card__row">
        <label class="profile-card__label" for="admin-create-password">{{ t('admin.users.password') }}</label>
        <div class="profile-card__control">
          <input
            id="admin-create-password"
            v-model="password"
            type="password"
            class="form-control form-control-sm profile-card__input"
            autocomplete="new-password"
            :placeholder="t('admin.users.passwordPlaceholder')"
            :class="{ 'is-invalid': errors.password }"
          />
          <div v-if="errors.password" class="invalid-feedback d-block">{{ errors.password }}</div>
        </div>
      </div>

      <div class="profile-card__row profile-card__row--last">
        <label class="profile-card__label" for="admin-create-password-confirm">{{ t('admin.users.confirmPassword') }}</label>
        <div class="profile-card__control">
          <input
            id="admin-create-password-confirm"
            v-model="confirmPassword"
            type="password"
            class="form-control form-control-sm profile-card__input"
            autocomplete="new-password"
            :placeholder="t('admin.users.confirmPasswordPlaceholder')"
            :class="{ 'is-invalid': errors.confirm_password }"
          />
          <div v-if="errors.confirm_password" class="invalid-feedback d-block">
            {{ errors.confirm_password }}
          </div>
        </div>
      </div>
    </div>

    <h2 class="admin-user-create__section-title">{{ t('admin.users.profile') }}</h2>
    <div class="profile-card">
      <UserProfileFields
        :fields="PROFILE_FIELDS"
        :form-data="formData"
        :errors="errors"
        id-prefix="admin-create"
      />
    </div>

    <div v-if="canSendNotification" class="form-check admin-user-create__notify">
      <input
        id="admin-create-send-notification"
        v-model="sendPasswordNotification"
        class="form-check-input"
        type="checkbox"
      />
      <label class="form-check-label" for="admin-create-send-notification">
        {{ t('admin.users.sendEmailNotify') }}
      </label>
    </div>

    <h2 class="admin-user-create__section-title">{{ t('admin.users.roleAndGroups') }}</h2>
    <div class="profile-card">
      <div class="profile-card__row">
        <label class="profile-card__label" for="admin-create-role">{{ t('admin.users.role') }}</label>
        <div class="profile-card__control">
          <SelectBox
            id="admin-create-role"
            v-model="selectedRoleId"
            :options="roleSelectOptions"
            value-key="id"
            label-key="name"
            :all-label="t('admin.users.roleUserDefault')"
            cast-to-number />
          <small class="text-muted">{{ t('admin.users.roleEmptyHint') }}</small>
        </div>
      </div>

      <div class="profile-card__row profile-card__row--last">
        <label class="profile-card__label" for="admin-create-groups">{{ t('admin.users.groups') }}</label>
        <div class="profile-card__control">
          <SelectBox
            id="admin-create-groups"
            v-model="selectedGroupIds"
            :options="roleGroupSelectOptions"
            value-key="id"
            label-key="name"
            :include-all-option="false"
            multiple
            show-checkboxes-when-multiple
            multiple-label-format="count"
            cast-to-number
            :disabled="!selectedRoleId" />
          <small class="text-muted">{{ t('admin.users.groupsHint') }}</small>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="saving" @click="handleClose">
        {{ t('admin.menu.cancel') }}
      </button>
      <button type="button" class="ui-btn ui-btn--primary" :disabled="saving" @click="handleCreate">
        <span v-if="saving">{{ t('admin.users.creating') }}</span>
        <span v-else>{{ t('admin.users.createAction') }}</span>
      </button>
    </template>
  </ModalCenter>
</template>

<style scoped lang="scss">
.admin-user-create__hint {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  line-height: 1.45;
}

.admin-user-create__section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin: 1.25rem 0 0.75rem;
}

.admin-user-create__notify {
  margin-top: 0.75rem;
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

  @media (width < $ui-bp-sm) {
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

.profile-card__control {
  flex: 1 1 60%;
  min-width: 0;
}

.profile-card__input {
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: 1px solid var(--color-border);
  box-shadow: none;

  &:focus {
    outline: none;
    background: var(--color-hover-background);
    border-color: var(--color-border);
    box-shadow: none;
  }
}
</style>
