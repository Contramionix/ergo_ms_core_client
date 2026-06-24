<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import ModalCenter from '@/components/ModalCenter.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AvatarBlock from '@/core/cms/adp/user/account/component/settings-panels/AvatarBlock.vue'
import AdminUserSecuritySection from '@/core/cms/adp/admin/UsersComponent/AdminUserSecuritySection.vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import {
  fetchAdminUser,
  updateAdminUser,
  deleteAdminUser,
  uploadAdminUserAvatar,
  deleteAdminUserAvatar,
  mapAdminUserToFormData,
  validateAdminProfileData,
} from '@/core/cms/adp/admin/js/adminUserService.js'
import { AssignRoleToUser } from '@/core/cms/adp/admin/js/GroupsPolitics'

const props = defineProps({
  show: { type: Boolean, default: false },
  userId: { type: Number, default: null },
  roles: { type: Array, default: () => [] },
  roleGroups: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:show', 'saved', 'deleted'])

const toast = useToast()
const userStore = useUserStore()
const BIO_MAX_LENGTH = 500
const PROFILE_FIELDS = [
  'email',
  'first_name',
  'last_name',
  'middle_name',
  'website',
  'country',
  'city',
  'bio',
]

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)
const errors = ref({})
const formData = ref({})
const avatarUrl = ref(null)
const selectedRoleId = ref('')
const selectedGroupIds = ref([])
const username = ref('')
const passwordResetMode = ref('system')

const bioCharCount = computed(() => (formData.value.bio || '').length)

const displayName = computed(() => {
  const parts = [formData.value.last_name, formData.value.first_name, formData.value.middle_name]
    .map((part) => (part || '').trim())
    .filter(Boolean)
  return parts.join(' ') || username.value || 'Пользователь'
})

const modalTitle = computed(() =>
  username.value ? `Настройки пользователя: ${username.value}` : 'Настройки пользователя',
)

const isCurrentUser = computed(() => props.userId != null && props.userId === userStore.user?.id)

const deleteConfirmMessage = computed(() => {
  const label = username.value || 'этого пользователя'
  return (
    `Удалить ${label}?\n\n` +
    'Учётная запись и связанные данные будут удалены без возможности восстановления.'
  )
})

const resetState = () => {
  formData.value = {}
  avatarUrl.value = null
  selectedRoleId.value = ''
  selectedGroupIds.value = []
  username.value = ''
  passwordResetMode.value = 'system'
  errors.value = {}
  showDeleteConfirm.value = false
}

const loadUser = async () => {
  if (!props.userId) return

  loading.value = true
  errors.value = {}
  try {
    const data = await fetchAdminUser(props.userId)
    username.value = data.username || ''
    formData.value = mapAdminUserToFormData(data)
    avatarUrl.value = data.avatar_url || null
    selectedRoleId.value = data.role?.id || ''
    selectedGroupIds.value = data.role_groups?.map((group) => group.id) || []
    passwordResetMode.value = data.password_reset_mode || 'system'
  } catch (error) {
    console.error('Ошибка загрузки пользователя:', error)
    toast.error('Не удалось загрузить данные пользователя')
    handleClose()
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.show, props.userId],
  ([isOpen, userId]) => {
    if (isOpen && userId) {
      loadUser()
    } else if (!isOpen) {
      resetState()
    }
  },
)

const handleClose = () => {
  emit('update:show', false)
}

const handleAvatarUpdated = (payload) => {
  avatarUrl.value = payload?.avatar_url ?? null
  emit('saved')
}

const handleAvatarUpload = async (file) => uploadAdminUserAvatar(props.userId, file)

const handleAvatarRemove = async () => {
  await deleteAdminUserAvatar(props.userId)
  return { avatar_url: null }
}

const handleSave = async () => {
  if (!props.userId || !selectedRoleId.value) {
    toast.error('Выберите роль пользователя')
    return
  }

  saving.value = true
  errors.value = {}

  try {
    const validation = validateAdminProfileData(formData.value)
    if (!validation.isValid) {
      errors.value = validation.errors
      return
    }

    const dataToSend = Object.fromEntries(
      PROFILE_FIELDS.map((field) => [field, formData.value[field]?.trim?.() ?? formData.value[field] ?? '']),
    )

    await updateAdminUser(props.userId, dataToSend)
    await AssignRoleToUser({
      user_id: props.userId,
      role_id: selectedRoleId.value,
      role_group_ids: selectedGroupIds.value,
    })

    toast.success('Настройки пользователя сохранены')
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('Ошибка сохранения пользователя:', error)
    if (error.response?.data) {
      errors.value = error.response.data
    } else {
      toast.error('Не удалось сохранить настройки пользователя')
    }
  } finally {
    saving.value = false
  }
}

const requestDelete = () => {
  if (!props.userId || isCurrentUser.value) return
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  if (!deleting.value) {
    showDeleteConfirm.value = false
  }
}

const confirmDelete = async () => {
  if (!props.userId || deleting.value || isCurrentUser.value) return

  deleting.value = true
  try {
    await deleteAdminUser(props.userId)
    toast.success('Пользователь удалён')
    showDeleteConfirm.value = false
    emit('deleted')
    handleClose()
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error)
    const message = error.response?.data?.error || 'Не удалось удалить пользователя'
    toast.error(message)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <ModalCenter modal-id="adminUserSettings" standalone :visible="show" :title="modalTitle" size="lg" scrollable @closemodal="handleClose">
    <div v-if="loading" class="admin-user-modal__loading">
      <SpinnerLoading color="primary" />
    </div>

    <template v-else-if="userId">
      <AvatarBlock :user-id="userId" :avatar-url="avatarUrl" :display-name="displayName" :first-name="formData.first_name" :last-name="formData.last_name" :saving="saving" :on-upload="handleAvatarUpload" :on-remove="handleAvatarRemove" @avatar-updated="handleAvatarUpdated"/>

      <h2 class="admin-user-modal__section-title">Профиль</h2>
      <div class="profile-card">
        <div class="profile-card__row">
          <label class="profile-card__label" for="admin-user-email">Email</label>
          <div class="profile-card__control">
            <input id="admin-user-email" v-model="formData.email" type="email" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.email }" autocomplete="email" placeholder="email@example.com"/>
            <div v-if="errors.email" class="invalid-feedback d-block">{{ errors.email }}</div>
          </div>
        </div>

        <div class="profile-card__row">
          <label class="profile-card__label" for="admin-user-last-name">Фамилия</label>
          <div class="profile-card__control">
            <input id="admin-user-last-name" v-model="formData.last_name" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.last_name }" autocomplete="family-name"/>
            <div v-if="errors.last_name" class="invalid-feedback d-block">{{ errors.last_name }}</div>
          </div>
        </div>

        <div class="profile-card__row">
          <label class="profile-card__label" for="admin-user-first-name">Имя</label>
          <div class="profile-card__control">
            <input id="admin-user-first-name" v-model="formData.first_name" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.first_name }" autocomplete="given-name"/>
            <div v-if="errors.first_name" class="invalid-feedback d-block">{{ errors.first_name }}</div>
          </div>
        </div>

        <div class="profile-card__row">
          <label class="profile-card__label" for="admin-user-middle-name">Отчество</label>
          <div class="profile-card__control">
            <input id="admin-user-middle-name" v-model="formData.middle_name" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.middle_name }" autocomplete="additional-name"/>
            <div v-if="errors.middle_name" class="invalid-feedback d-block">{{ errors.middle_name }}</div>
          </div>
        </div>

        <div class="profile-card__row">
          <label class="profile-card__label" for="admin-user-website">Веб-сайт</label>
          <div class="profile-card__control">
            <input id="admin-user-website" v-model="formData.website" type="url" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.website }" autocomplete="url"/>
            <div v-if="errors.website" class="invalid-feedback d-block">{{ errors.website }}</div>
          </div>
        </div>

        <div class="profile-card__row">
          <label class="profile-card__label" for="admin-user-country">Страна</label>
          <div class="profile-card__control">
            <input id="admin-user-country" v-model="formData.country" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.country }" autocomplete="country-name"/>
            <div v-if="errors.country" class="invalid-feedback d-block">{{ errors.country }}</div>
          </div>
        </div>

        <div class="profile-card__row">
          <label class="profile-card__label" for="admin-user-city">Город</label>
          <div class="profile-card__control">
            <input id="admin-user-city" v-model="formData.city" type="text" class="form-control form-control-sm profile-card__input" :class="{ 'is-invalid': errors.city }" autocomplete="address-level2"/>
            <div v-if="errors.city" class="invalid-feedback d-block">{{ errors.city }}</div>
          </div>
        </div>

        <div class="profile-card__row profile-card__row--last">
          <label class="profile-card__label" for="admin-user-bio">О себе</label>
          <div class="profile-card__control">
            <textarea id="admin-user-bio" v-model="formData.bio" rows="4" :maxlength="BIO_MAX_LENGTH" class="form-control form-control-sm profile-card__input profile-card__textarea" :class="{ 'is-invalid': errors.bio }"/>
            <div class="profile-card__char-counter" :class="{ 'profile-card__char-counter--limit': bioCharCount >= BIO_MAX_LENGTH }">
              {{ bioCharCount }}/{{ BIO_MAX_LENGTH }}
            </div>
            <div v-if="errors.bio" class="invalid-feedback d-block">{{ errors.bio }}</div>
          </div>
        </div>
      </div>

      <h2 class="admin-user-modal__section-title">Роль и группы</h2>
      <div class="profile-card">
        <div class="profile-card__row">
          <label class="profile-card__label" for="admin-user-role">Роль</label>
          <div class="profile-card__control">
            <select id="admin-user-role" v-model="selectedRoleId" class="form-select form-select-sm" required>
              <option value="" disabled>Выберите роль</option>
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }} ({{ role.role_type_display }})
              </option>
            </select>
          </div>
        </div>

        <div class="profile-card__row profile-card__row--last">
          <label class="profile-card__label" for="admin-user-groups">Ролевые группы</label> <!-- TODO: В очереди на рефакторинг -->
          <div class="profile-card__control">
            <select id="admin-user-groups" v-model="selectedGroupIds" class="form-select form-select-sm" multiple size="5">
              <option v-for="group in roleGroups" :key="group.id" :value="group.id">
                {{ group.name }} · {{ group.parent_role_name }}
              </option>
            </select>
            <small class="text-muted">Удерживайте Ctrl/Cmd для выбора нескольких групп.</small>
          </div>
        </div>
      </div>

      <AdminUserSecuritySection :user-id="userId" :username="username" :password-reset-mode="passwordResetMode"/>

      <h2 class="admin-user-modal__section-title admin-user-modal__section-title--danger">Опасная зона</h2>
      <div class="profile-card profile-card--danger">
        <div class="profile-card__row profile-card__row--last">
          <div class="profile-card__label-block">
            <span class="profile-card__label">Удаление</span>
            <span class="profile-card__hint">
              Удаление учётной записи необратимо. Все сессии пользователя будут завершены.
            </span>
          </div>
          <div class="profile-card__control profile-card__control--actions">
            <button
              type="button"
              class="btn btn-sm btn-danger"
              :disabled="saving || deleting || isCurrentUser"
              @click="requestDelete"
            >
              <span v-if="deleting">Удаление...</span>
              <span v-else>Удалить пользователя</span>
            </button>
            <small v-if="isCurrentUser" class="text-muted profile-card__inline-warning">
              Нельзя удалить собственную учётную запись.
            </small>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <button type="button" class="btn btn-secondary" :disabled="saving || deleting" @click="handleClose">Отмена</button>
      <button type="button" class="btn btn-primary" :disabled="saving || loading || deleting" @click="handleSave">
        <span v-if="saving">Сохранение...</span>
        <span v-else>Сохранить</span>
      </button>
    </template>
  </ModalCenter>

  <ConfirmDialog
    :show="showDeleteConfirm"
    title="Удаление пользователя"
    :message="deleteConfirmMessage"
    confirm-text="Удалить"
    cancel-text="Отмена"
    variant="danger"
    :loading="deleting"
    :z-index="1100"
    @confirm="confirmDelete"
    @cancel="closeDeleteConfirm"
    @close="closeDeleteConfirm"
  />
</template>

<style scoped lang="scss">
.admin-user-modal__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 12rem;
}

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

  @media (max-width: 575.98px) {
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

  @media (max-width: 575.98px) {
    align-items: stretch;
    padding-top: 0;
  }
}

.profile-card__inline-warning {
  display: block;
  font-size: 0.75rem;
  margin-top: 0.375rem;
  text-align: right;

  @media (max-width: 575.98px) {
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