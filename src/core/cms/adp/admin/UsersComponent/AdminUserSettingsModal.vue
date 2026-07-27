<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, computed, watch } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import ModalCenter from '@/components/ModalCenter.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { confirmAction, confirmDelete } from '@/js/utils/confirm.js'
import AvatarBlock from '@/core/cms/adp/user/account/component/settings-panels/AvatarBlock.vue'
import UserProfileFields from '@/core/cms/adp/user/account/component/settings-panels/UserProfileFields.vue'
import AdminUserSecuritySection from '@/core/cms/adp/admin/UsersComponent/AdminUserSecuritySection.vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { tGlobal } from '@/i18n/index.js'
import {
  fetchAdminUser,
  updateAdminUser,
  deleteAdminUser,
  uploadAdminUserAvatar,
  deleteAdminUserAvatar,
  mapAdminUserToFormData,
  validateAdminProfileData,
} from '@/core/cms/adp/admin/js/adminUserService.js'
import {
  USER_PROFILE_ALL_FIELDS,
  buildUserProfilePayload,
  applyProfileApiErrors,
} from '@/core/cms/adp/js/userProfileForm.js'
import { assignRoleToUser } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import SelectBox from '@/components/SelectBox.vue'
import { mapRoleSelectOptions, mapRoleGroupSelectOptions } from '@/core/cms/js/adminSelectOptions.js'

const { t } = useAppI18n()

const props = defineProps({
  show: { type: Boolean, default: false },
  userRef: { type: String, default: null },
  roles: { type: Array, default: () => [] },
  roleGroups: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:show', 'saved', 'deleted'])

const toast = useToast()
const userStore = useUserStore()
const PROFILE_FIELDS = USER_PROFILE_ALL_FIELDS

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const errors = ref({})
const formData = ref({})
const avatarUrl = ref(null)
const userPublicId = ref(null)
const selectedRoleId = ref(null)
const selectedGroupIds = ref([])
const username = ref('')
const passwordResetMode = ref('system')
const loadedUserId = ref(null)
const isActive = ref(true)
const initialRoleIsAdmin = ref(false)

const displayName = computed(() => {
  const parts = [formData.value.first_name, formData.value.middle_name, formData.value.last_name]
    .map((part) => (part || '').trim())
    .filter(Boolean)
  return parts.join(' ') || username.value || tGlobal('admin.users.colUser')
})

const modalTitle = computed(() =>
  username.value ? tGlobal('admin.users.settingsTitleNamed', { username: username.value }) : tGlobal('admin.users.settingsTitle'),
)

const isCurrentUser = computed(
  () => loadedUserId.value != null && loadedUserId.value === userStore.user?.id,
)

const roleSelectOptions = computed(() => mapRoleSelectOptions(props.roles))
const roleGroupSelectOptions = computed(() => mapRoleGroupSelectOptions(props.roleGroups))

const resetState = () => {
  formData.value = {}
  avatarUrl.value = null
  userPublicId.value = null
  selectedRoleId.value = null
  selectedGroupIds.value = []
  username.value = ''
  passwordResetMode.value = 'system'
  loadedUserId.value = null
  isActive.value = true
  initialRoleIsAdmin.value = false
  errors.value = {}
}

const loadUser = async () => {
  if (!props.userRef) return

  loading.value = true
  errors.value = {}
  try {
    const data = await fetchAdminUser(props.userRef)
    username.value = data.username || ''
    formData.value = mapAdminUserToFormData(data)
    avatarUrl.value = data.avatar_url || null
    userPublicId.value = data.public_id || null
    loadedUserId.value = data.user_id ?? null
    selectedRoleId.value = data.role?.id ?? null
    selectedGroupIds.value = data.role_groups?.map((group) => group.id) || []
    passwordResetMode.value = data.password_reset_mode || 'system'
    isActive.value = data.is_active !== false
    initialRoleIsAdmin.value = data.role?.role_type === 'admin'
  } catch (error) {
    logError('Ошибка загрузки пользователя:', error)
    toast.error(tGlobal('admin.users.settingsLoadError'))
    handleClose()
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.show, props.userRef],
  ([isOpen, userRef]) => {
    if (isOpen && userRef) {
      loadUser()
    } else if (!isOpen) {
      resetState()
    }
  },
)

const handleStatusChanged = (nextActive) => {
  isActive.value = nextActive !== false
  emit('saved')
}

const handleClose = () => {
  emit('update:show', false)
}

const handleAvatarUpdated = (payload) => {
  avatarUrl.value = payload?.avatar_url ?? null
  emit('saved')
}

const handleAvatarUpload = async (file) => uploadAdminUserAvatar(props.userRef, file)

const handleAvatarRemove = async () => {
  await deleteAdminUserAvatar(props.userRef)
  return { avatar_url: null }
}

const isSelectedRoleAdmin = computed(() => {
  const role = props.roles.find((item) => item.id === selectedRoleId.value)
  return role?.role_type === 'admin'
})

const isSelfAdminDemotion = computed(
  () =>
    isCurrentUser.value &&
    initialRoleIsAdmin.value &&
    !isSelectedRoleAdmin.value,
)

const handleSave = async () => {
  if (!props.userRef) return

  if (isSelfAdminDemotion.value) {
    const ok = await confirmAction({
      title: tGlobal('admin.users.removeAdminTitle'),
      message: (
        tGlobal('admin.users.removeAdminMessage')
      ),
      confirmText: tGlobal('admin.users.removeAdminConfirm'),
      variant: 'warning',
    })
    if (!ok) return
  }

  saving.value = true
  errors.value = {}

  try {
    const validation = validateAdminProfileData(formData.value)
    if (!validation.isValid) {
      errors.value = validation.errors
      return
    }

    const dataToSend = buildUserProfilePayload(formData.value, PROFILE_FIELDS)
    await updateAdminUser(props.userRef, dataToSend)

    if (selectedRoleId.value && loadedUserId.value) {
      await assignRoleToUser({
        user_id: loadedUserId.value,
        role_id: selectedRoleId.value,
        role_group_ids: selectedGroupIds.value,
      })
    }

    toast.success(tGlobal('admin.users.settingsSaved'))
    emit('saved')
    handleClose()
  } catch (error) {
    logError('Ошибка сохранения пользователя:', error)
    const apiError = error.response?.data?.error
    if (apiError) {
      toast.error(apiError)
    } else if (!applyProfileApiErrors(error, errors)) {
      toast.error(tGlobal('admin.users.settingsSaveError'))
    }
  } finally {
    saving.value = false
  }
}

const requestDelete = async () => {
  if (!props.userRef || isCurrentUser.value) {
    return
  }

  const label = username.value || tGlobal('admin.users.thisUser')
  const ok = await confirmDelete(
    tGlobal('admin.users.deleteTitle'),
    tGlobal('admin.users.deleteMessage', { name: label }),
  )
  if (!ok || deleting.value) {
    return
  }

  deleting.value = true
  try {
    await deleteAdminUser(props.userRef)
    toast.success(tGlobal('admin.users.userDeleted'))
    emit('deleted')
    handleClose()
  } catch (error) {
    logError('Ошибка удаления пользователя:', error)
    const message = error.response?.data?.error || tGlobal('admin.users.deleteFailed')
    toast.error(message)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <ModalCenter modal-id="adminUserSettings" standalone :visible="show" :title="modalTitle" size="lg" scrollable @closemodal="handleClose">
    <LoadingContentArea :loading="loading" :reset-key="userRef" min-height="16rem">
    <template v-if="userRef">
      <AvatarBlock :user-ref="userPublicId || userRef" :avatar-url="avatarUrl" :display-name="displayName" :first-name="formData.first_name" :last-name="formData.last_name" :saving="saving" :on-upload="handleAvatarUpload" :on-remove="handleAvatarRemove" @avatar-updated="handleAvatarUpdated"/>

      <h2 class="admin-user-modal__section-title">{{ t('admin.users.profile') }}</h2>
      <div class="profile-card">
        <UserProfileFields
          :fields="PROFILE_FIELDS"
          :form-data="formData"
          :errors="errors"
          id-prefix="admin-user"
        />
      </div>

      <h2 class="admin-user-modal__section-title">{{ t('admin.users.roleAndGroups') }}</h2>
      <div class="profile-card">
        <div class="profile-card__row">
          <label class="profile-card__label" for="admin-user-role">{{ t('admin.users.role') }}</label>
          <div class="profile-card__control">
            <SelectBox
              id="admin-user-role"
              v-model="selectedRoleId"
              :options="roleSelectOptions"
              value-key="id"
              label-key="name"
              :all-label="t('admin.users.noRole')"
              cast-to-number />
            <small class="text-muted">{{ t('admin.users.roleHelp') }}</small>
          </div>
        </div>

        <div class="profile-card__row profile-card__row--last">
          <label class="profile-card__label" for="admin-user-groups">{{ t('admin.users.groups') }}</label>
          <div class="profile-card__control">
            <SelectBox
              id="admin-user-groups"
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

      <AdminUserSecuritySection
        :user-ref="userRef"
        :username="username"
        :password-reset-mode="passwordResetMode"
        :is-active="isActive"
        :is-current-user="isCurrentUser"
        @status-changed="handleStatusChanged"
      />

      <h2 class="admin-user-modal__section-title admin-user-modal__section-title--danger">{{ t('admin.users.deleteAccount') }}</h2>
      <div class="profile-card profile-card--danger">
        <div class="profile-card__row profile-card__row--danger profile-card__row--last">
          <div class="profile-card__label-block">
            <span class="profile-card__label">{{ t('admin.users.delete') }}</span>
            <span class="profile-card__hint">
              {{ t('admin.users.deleteAccountHint') }}
            </span>
          </div>
          <div class="profile-card__control profile-card__control--actions">
            <button
              type="button"
              class="btn btn-sm btn-danger"
              :disabled="saving || deleting || isCurrentUser"
              @click="requestDelete"
            >
              <span v-if="deleting">{{ t('admin.users.deleting') }}</span>
              <span v-else>{{ t('admin.users.deleteAction') }}</span>
            </button>
            <small v-if="isCurrentUser" class="text-muted profile-card__inline-warning">
              {{ t('admin.users.cannotDeleteSelf') }}
            </small>
          </div>
        </div>
      </div>
    </template>
    </LoadingContentArea>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="saving || deleting" @click="handleClose">{{ t('admin.menu.cancel') }}</button>
      <button type="button" class="ui-btn ui-btn--primary" :disabled="saving || loading || deleting" @click="handleSave">
        <span v-if="saving">{{ t('admin.users.saving') }}</span>
        <span v-else>{{ t('admin.users.save') }}</span>
      </button>
    </template>
  </ModalCenter>
</template>

<style scoped lang="scss">
.admin-user-modal__section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin: 1.25rem 0 0.75rem;
}

.admin-user-modal__section-title--danger {
  color: var(--bs-danger, #dc3545);
}

.profile-card--danger {
  border-color: rgba(var(--bs-danger-rgb, 220, 53, 69), 0.35);
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

.profile-card__row--danger {
  align-items: center;
  padding-block: 0.875rem;

  .profile-card__label-block {
    padding-top: 0;
    justify-content: center;

    .profile-card__label {
      color: var(--color-primary-text);
      font-weight: 600;
    }
  }

  .profile-card__control--actions {
    padding-top: 0;
    justify-content: center;
  }

  .profile-card__inline-warning {
    margin-top: 0;
  }

  @media (width < $ui-bp-sm) {
    align-items: stretch;
  }
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

.profile-card__label-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 0 0 auto;
  min-width: 6.5rem;
  max-width: 40%;
  padding-top: 0.35rem;

  .profile-card__label {
    padding-top: 0;
  }

  @media (width < $ui-bp-sm) {
    max-width: none;
    padding-top: 0;
  }
}

.profile-card__hint {
  font-size: 0.75rem;
  color: var(--color-secondary-text);
  opacity: 0.85;
  line-height: 1.35;
}

.profile-card__control--actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.375rem;
  flex: 0 0 auto;
  width: auto;
  padding-top: 0.35rem;

  @media (width < $ui-bp-sm) {
    align-items: stretch;
    padding-top: 0;
  }
}

.profile-card__inline-warning {
  display: block;
  font-size: 0.75rem;
  margin-top: 0.375rem;
  text-align: right;

  @media (width < $ui-bp-sm) {
    text-align: left;
  }
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
</style>