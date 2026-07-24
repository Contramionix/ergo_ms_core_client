<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { confirmAction } from '@/js/utils/confirm.js'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SessionCard from '@/core/cms/adp/user/account/component/settings-panels/SessionCard.vue'
import { profileService } from '@/core/cms/js/profileService.js'
import {
  resetAdminUserPassword,
  setAdminUserStatus,
  fetchAdminUserDevices,
  revokeAdminUserDevice,
  revokeAdminUserSessions,
} from '@/core/cms/adp/admin/js/adminUserService.js'
import { validatePasswordValue } from '@/js/passwordPolicy.js'

const PAGE_SIZE = 5

const props = defineProps({
  userRef: { type: String, default: null },
  username: { type: String, default: '' },
  passwordResetMode: { type: String, default: 'system' },
  isActive: { type: Boolean, default: true },
  isCurrentUser: { type: Boolean, default: false },
})

const emit = defineEmits(['status-changed'])

const toast = useToast()
const resetting = ref(false)
const statusUpdating = ref(false)
const revokingAll = ref(false)
const newPassword = ref('')
const passwordError = ref('')

const loadingDevices = ref(false)
const devices = ref([])
const deletingDeviceId = ref(null)
const currentPage = ref(1)
const localIsActive = ref(true)

const isManualMode = computed(() => props.passwordResetMode === 'manual')

const rowsForPage = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return devices.value.slice(start, start + PAGE_SIZE)
})

const paginationTotal = computed(() => devices.value.length)

const paginationFrom = computed(() => {
  if (paginationTotal.value === 0) return 0
  return (currentPage.value - 1) * PAGE_SIZE + 1
})

const paginationTo = computed(() => {
  if (paginationTotal.value === 0) return 0
  return Math.min(paginationTotal.value, currentPage.value * PAGE_SIZE)
})

const totalPages = computed(() => Math.max(1, Math.ceil(paginationTotal.value / PAGE_SIZE) || 1))
const canPrev = computed(() => currentPage.value > 1)
const canNext = computed(() => currentPage.value < totalPages.value)

const statusHint = computed(() => {
  if (props.isCurrentUser) {
    return 'Нельзя приостановить собственную учётную запись.'
  }
  if (localIsActive.value) {
    return 'Приостановка запрещает вход и сразу завершает все сессии пользователя.'
  }
  return 'Пользователь не сможет войти, пока аккаунт приостановлен.'
})

watch(
  () => props.isActive,
  (value) => {
    localIsActive.value = value !== false
  },
  { immediate: true },
)

watch(
  () => props.userRef,
  (userRef) => {
    currentPage.value = 1
    devices.value = []
    if (userRef) {
      loadDevices()
    }
  },
  { immediate: true },
)

const loadDevices = async () => {
  if (!props.userRef) return

  loadingDevices.value = true
  try {
    const response = await fetchAdminUserDevices(props.userRef)
    const list = Array.isArray(response) ? response : []
    devices.value = list.map((device) => profileService.formatDeviceData(device)).filter(Boolean)
  } catch (error) {
    logError('Ошибка загрузки сессий пользователя:', error)
    toast.error('Не удалось загрузить сессии')
    devices.value = []
  } finally {
    loadingDevices.value = false
  }
}

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

const requestSystemReset = async () => {
  if (!props.userRef || resetting.value) return

  const label = props.username || 'пользователя'
  const ok = await confirmAction({
    title: 'Сброс пароля',
    message: (
      `Сбросить пароль для ${label}?\n\nБудет установлен случайный пароль, все сессии завершены. ` +
      'Для входа пользователю нужно воспользоваться формой «Забыл пароль».'
    ),
    confirmText: 'Сбросить',
    variant: 'danger',
  })
  if (!ok) return

  resetting.value = true
  try {
    await resetAdminUserPassword(props.userRef)
    toast.success('Пароль сброшен')
    await loadDevices()
  } catch (error) {
    logError('Ошибка сброса пароля:', error)
    const message = error.response?.data?.error || 'Не удалось сбросить пароль'
    toast.error(message)
  } finally {
    resetting.value = false
  }
}

const handleManualSet = async () => {
  if (!props.userRef || !validateManualPassword()) return

  resetting.value = true
  passwordError.value = ''
  try {
    const result = await resetAdminUserPassword(props.userRef, {
      new_password: newPassword.value,
      confirm_password: newPassword.value,
    })
    toast.success(result.message || 'Пароль установлен')
    newPassword.value = ''
    await loadDevices()
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

const toggleAccountStatus = async () => {
  if (!props.userRef || statusUpdating.value || props.isCurrentUser) return

  const nextActive = !localIsActive.value
  const label = props.username || 'пользователя'
  const ok = await confirmAction({
    title: nextActive ? 'Возобновление аккаунта' : 'Приостановка аккаунта',
    message: nextActive
      ? `Возобновить доступ для ${label}? Пользователь снова сможет войти в систему.`
      : (
        `Приостановить аккаунт ${label}?\n\n` +
        'Пользователь не сможет войти, все активные сессии будут завершены.'
      ),
    confirmText: nextActive ? 'Возобновить' : 'Приостановить',
    variant: nextActive ? 'primary' : 'warning',
  })
  if (!ok) return

  statusUpdating.value = true
  try {
    const data = await setAdminUserStatus(props.userRef, nextActive)
    localIsActive.value = data.is_active !== false
    emit('status-changed', localIsActive.value)
    toast.success(localIsActive.value ? 'Аккаунт возобновлён' : 'Аккаунт приостановлен')
    await loadDevices()
  } catch (error) {
    logError('Ошибка изменения статуса аккаунта:', error)
    const message = error.response?.data?.error || 'Не удалось изменить статус аккаунта'
    toast.error(message)
  } finally {
    statusUpdating.value = false
  }
}

const handleRevokeDevice = async (id) => {
  if (!props.userRef || deletingDeviceId.value != null) return

  const target = devices.value.find((device) => device.id === id)
  if (target?.isCurrent) {
    toast.warning('Нельзя завершить текущую сессию')
    return
  }

  try {
    deletingDeviceId.value = id
    await revokeAdminUserDevice(props.userRef, id)
    devices.value = devices.value.filter((device) => device.id !== id)
    toast.success('Сессия отозвана')
    const maxPage = Math.max(1, Math.ceil(devices.value.length / PAGE_SIZE) || 1)
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage
    }
  } catch (error) {
    logError('Не удалось отозвать сессию', error)
    const message = error.response?.data?.error || 'Не удалось отозвать сессию'
    toast.error(message)
  } finally {
    deletingDeviceId.value = null
  }
}

const handleRevokeAllSessions = async () => {
  if (!props.userRef || revokingAll.value) return

  const label = props.username || 'пользователя'
  const ok = await confirmAction({
    title: 'Завершение сессий',
    message: props.isCurrentUser
      ? `Завершить все сессии ${label}, кроме текущей?`
      : `Завершить все активные сессии ${label}? Пользователю потребуется войти заново.`,
    confirmText: 'Завершить',
    variant: 'warning',
  })
  if (!ok) return

  revokingAll.value = true
  try {
    const result = await revokeAdminUserSessions(props.userRef)
    toast.success(result.message || 'Сессии завершены')
    await loadDevices()
  } catch (error) {
    logError('Ошибка завершения сессий:', error)
    const message = error.response?.data?.error || 'Не удалось завершить сессии'
    toast.error(message)
  } finally {
    revokingAll.value = false
  }
}

const goPrev = () => {
  if (canPrev.value) currentPage.value -= 1
}

const goNext = () => {
  if (canNext.value) currentPage.value += 1
}
</script>

<template>
  <div>
    <h2 class="admin-user-modal__section-title">Безопасность</h2>
    <div class="profile-card">
      <div class="profile-card__row">
        <div class="profile-card__label-block">
          <span class="profile-card__label">Статус аккаунта</span>
          <span class="profile-card__hint">{{ statusHint }}</span>
        </div>
        <div class="profile-card__control profile-card__control--actions">
          <span
            class="account-status-badge"
            :class="localIsActive ? 'account-status-badge--active' : 'account-status-badge--suspended'"
          >
            {{ localIsActive ? 'Активен' : 'Приостановлен' }}
          </span>
          <button
            type="button"
            class="btn btn-sm"
            :class="localIsActive ? 'btn-outline-warning' : 'btn-outline-success'"
            :disabled="statusUpdating || isCurrentUser"
            @click="toggleAccountStatus"
          >
            <span v-if="statusUpdating">...</span>
            <span v-else>{{ localIsActive ? 'Приостановить' : 'Возобновить' }}</span>
          </button>
        </div>
      </div>

      <template v-if="isManualMode">
        <div class="profile-card__row profile-card__row--last">
          <span class="profile-card__label">Пароль</span>
          <div class="profile-card__control">
            <div class="password-field-shell" :class="{ 'password-field-shell--invalid': passwordError }">
              <input
                id="admin-user-new-password"
                v-model="newPassword"
                type="password"
                class="password-field-shell__input form-control-sm"
                placeholder="Новый пароль"
                autocomplete="new-password"
                :disabled="resetting"
              />
              <div class="password-field-shell__actions">
                <button
                  type="button"
                  class="btn btn-sm password-field-shell__btn password-field-shell__btn--apply"
                  :disabled="resetting"
                  @click="handleManualSet"
                >
                  <span v-if="resetting">...</span>
                  <span v-else>Изменить</span>
                </button>
                <button
                  type="button"
                  class="btn btn-sm password-field-shell__btn password-field-shell__btn--reset"
                  :disabled="resetting"
                  @click="requestSystemReset"
                >
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

    <div class="sessions-block__header">
      <p class="sessions-block__caption">Активные сессии</p>
      <button
        type="button"
        class="btn btn-sm btn-outline-warning"
        :disabled="revokingAll || loadingDevices || paginationTotal === 0"
        @click="handleRevokeAllSessions"
      >
        <span v-if="revokingAll">Завершение...</span>
        <span v-else>{{ isCurrentUser ? 'Завершить остальные' : 'Завершить все' }}</span>
      </button>
    </div>

    <div class="profile-card profile-card--sessions">
      <LoadingContentArea :loading="loadingDevices" min-height="6rem">
        <div v-if="paginationTotal === 0" class="sessions__empty text-muted small py-3 px-2">
          Нет активных сессий
        </div>

        <div v-else class="sessions__list">
          <SessionCard
            v-for="device in rowsForPage"
            :key="device.id"
            :device="device"
            :revoking="deletingDeviceId === device.id"
            @revoke="handleRevokeDevice"
          />
        </div>

        <div v-if="paginationTotal > 0" class="sessions__footer">
          <span class="sessions__range text-muted small">
            Показано {{ paginationFrom }}–{{ paginationTo }} из {{ paginationTotal }}
          </span>
          <div class="sessions__pager">
            <button type="button" class="btn btn-link btn-sm sessions__pager-btn" :disabled="!canPrev" @click="goPrev">
              Назад
            </button>
            <span class="sessions__page-indicator small text-muted">{{ currentPage }} / {{ totalPages }}</span>
            <button type="button" class="btn btn-link btn-sm sessions__pager-btn" :disabled="!canNext" @click="goNext">
              Вперёд
            </button>
          </div>
        </div>
      </LoadingContentArea>
    </div>

    <p class="sessions__disclaimer text-muted small mt-2 mb-0">
      Отзыв сессии немедленно завершает вход на выбранном устройстве.
    </p>
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

.profile-card--sessions {
  margin-top: 0;
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

.account-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;

  &--active {
    color: var(--bs-success, #198754);
    background: color-mix(in srgb, var(--bs-success, #198754) 12%, transparent);
  }

  &--suspended {
    color: var(--bs-warning-text-emphasis, #997404);
    background: color-mix(in srgb, var(--bs-warning, #ffc107) 18%, transparent);
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

.sessions-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 1rem 0 0.5rem;
}

.sessions-block__caption {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.sessions__empty {
  text-align: center;
}

.sessions__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 1rem 0.75rem;
  border-top: 1px solid var(--color-border);

  @media (max-width: 575.98px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.sessions__pager {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sessions__pager-btn {
  padding: 0;
  text-decoration: none;

  &:disabled {
    opacity: 0.45;
  }
}

.sessions__disclaimer {
  line-height: 1.35;
}
</style>
