<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { resetAdminUserPassword } from '@/core/cms/adp/admin/js/adminUserService.js'
import { validatePasswordValue } from '@/js/passwordPolicy.js'

const props = defineProps({
  userId: { type: Number, default: null },
  username: { type: String, default: '' },
  passwordResetMode: { type: String, default: 'system' },
})

const toast = useToast()
const resetting = ref(false)
const showResetConfirm = ref(false)
const newPassword = ref('')
const passwordError = ref('')

const isManualMode = computed(() => props.passwordResetMode === 'manual')

const resetConfirmMessage = computed(() => {
  const label = props.username || 'пользователя'
  return (
    `Сбросить пароль для ${label}?\n\nБудет установлен случайный пароль, все сессии завершены. ` +
    'Для входа пользователю нужно воспользоваться формой «Забыл пароль».'
  )
})

const validateManualPassword = () => {
  passwordError.value = ''
  const value = newPassword.value

  if (!value) {
    passwordError.value = 'Введите новый пароль'
  } else {
    const complexityError = validatePasswordValue(value)
    if (complexityError) {
      passwordError.value = complexityError
    }
  }

  return !passwordError.value
}

const requestSystemReset = () => {
  if (!props.userId) return
  showResetConfirm.value = true
}

const closeResetConfirm = () => {
  if (!resetting.value) {
    showResetConfirm.value = false
  }
}

const confirmSystemReset = async () => {
  if (!props.userId || resetting.value) return

  resetting.value = true
  try {
    await resetAdminUserPassword(props.userId)
    toast.success('Пароль сброшен')
    showResetConfirm.value = false
  } catch (error) {
    logError('Ошибка сброса пароля:', error)
    const message = error.response?.data?.error || 'Не удалось сбросить пароль'
    toast.error(message)
  } finally {
    resetting.value = false
  }
}

const handleManualSet = async () => {
  if (!props.userId || !validateManualPassword()) return

  resetting.value = true
  passwordError.value = ''
  try {
    const result = await resetAdminUserPassword(props.userId, {
      new_password: newPassword.value,
      confirm_password: newPassword.value,
    })
    toast.success(result.message || 'Пароль установлен')
    newPassword.value = ''
  } catch (error) {
    logError('Ошибка установки пароля:', error)
    const data = error.response?.data
    if (data) {
      passwordError.value = data.new_password || data.confirm_password || ''
      if (data.error) toast.error(data.error)
      else if (typeof data === 'string') toast.error(data)
      else if (!passwordError.value) {
        toast.error('Не удалось установить пароль')
      }
    } else {
      toast.error('Не удалось установить пароль')
    }
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="admin-user-modal__section-title">Безопасность</h2>
    <div class="profile-card">
      <template v-if="isManualMode">
        <div class="profile-card__row profile-card__row--last">
          <span class="profile-card__label">Пароль</span>
          <div class="profile-card__control">
            <div class="password-field-shell" :class="{ 'password-field-shell--invalid': passwordError }">
              <input id="admin-user-new-password" v-model="newPassword" type="password" class="password-field-shell__input form-control-sm" placeholder="Новый пароль" autocomplete="new-password" :disabled="resetting"/>
              <div class="password-field-shell__actions">
                <button type="button" class="btn btn-sm password-field-shell__btn password-field-shell__btn--apply" :disabled="resetting" @click="handleManualSet">
                  <span v-if="resetting">...</span>
                  <span v-else>Изменить</span>
                </button>
                <button type="button" class="btn btn-sm password-field-shell__btn password-field-shell__btn--reset" :disabled="resetting" @click="requestSystemReset">
                  Сбросить
                </button>
              </div>
            </div>
            <div v-if="passwordError" class="invalid-feedback d-block">{{ passwordError }}</div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="profile-card__row profile-card__row--last">
          <div class="profile-card__label-block">
            <span class="profile-card__label">Пароль</span>
            <span class="profile-card__hint">
              Случайный пароль, никому не известен. Сессии завершены.
              Вход через «Забыл пароль».
            </span>
          </div>
          <div class="profile-card__control profile-card__control--actions">
            <button type="button" class="btn btn-sm btn-outline-danger" :disabled="resetting" @click="requestSystemReset">
              <span v-if="resetting">Сброс...</span>
              <span v-else>Сбросить пароль</span>
            </button>
          </div>
        </div>
      </template>
    </div>

    <ConfirmDialog :show="showResetConfirm" title="Сброс пароля" :message="resetConfirmMessage" confirm-text="Сбросить" cancel-text="Отмена" variant="danger" :loading="resetting" :z-index="1100" @confirm="confirmSystemReset" @cancel="closeResetConfirm" @close="closeResetConfirm"/>
  </div>
</template>

<style scoped lang="scss">
.admin-user-modal__section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin: 1.25rem 0 0.75rem;
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

  @media (max-width: 575.98px) {
    padding-top: 0;
  }
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

.profile-card__control {
  flex: 1 1 60%;
  min-width: 0;

  &--actions {
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
}

.password-field-shell {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background: var(--color-primary-background);
  overflow: hidden;
  min-height: 2rem;

  &--invalid {
    border-color: var(--bs-danger, #dc3545);
  }

  &:focus-within:not(.password-field-shell--invalid) {
    background: var(--color-hover-background);
  }

  &__input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--color-primary-text);
    padding: 0.25rem 0.5rem;
    min-width: 0;
    font-size: 0.875rem;
    box-shadow: none;

    &::placeholder {
      color: var(--color-secondary-text);
      opacity: 0.75;
    }

    &:focus {
      outline: none;
      background: transparent;
      box-shadow: none;
    }

    &:disabled {
      opacity: 0.65;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem;
    flex-shrink: 0;
  }

  &__btn {
    border-radius: 0.25rem;
    white-space: nowrap;
    padding: 0.2rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.2;
    border: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;

    @media (max-width: 575.98px) {
      padding: 0.2rem 0.5rem;
      font-size: 0.75rem;
    }

    &:disabled {
      opacity: 0.55;
      box-shadow: none;
    }

    &--apply {
      background-color: var(--bs-success, #198754);
      color: #fff;

      &:hover:not(:disabled) {
        background-color: var(--bs-success-text-emphasis, #146c43);
        color: #fff;
      }

      &:focus-visible {
        outline: 2px solid var(--bs-success, #198754);
        outline-offset: 1px;
        color: #fff;
      }
    }

    &--reset {
      background-color: var(--color-secondary-background, #e9ecef);
      color: var(--color-secondary-text, #5c636a);
      border: 1px solid var(--color-border);

      &:hover:not(:disabled) {
        background-color: var(--color-hover-background, #dee2e6);
        color: var(--color-primary-text);
      }

      &:focus-visible {
        outline: 2px solid var(--color-border);
        outline-offset: 1px;
      }
    }
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
</style>
