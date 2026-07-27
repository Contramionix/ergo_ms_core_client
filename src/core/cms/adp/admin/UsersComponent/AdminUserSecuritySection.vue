<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { confirmAction } from '@/js/utils/confirm.js'
import { logError } from '@/js/utils/logError.js'
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

    <div class="profile-card profile-card--stack">
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
            class="btn btn-sm profile-card__action"
            :disabled="statusUpdating || isCurrentUser"
            @click="toggleAccountStatus"
          >
            <span v-if="statusUpdating">...</span>
            <span v-else>{{ localIsActive ? 'Приостановить' : 'Возобновить' }}</span>
          </button>
        </div>
      </div>

      <template v-if="isManualMode">
        <div class="profile-card__row profile-card__row--last profile-card__row--password">
          <div class="profile-card__label-block">
            <label class="profile-card__label" for="admin-user-new-password">Пароль</label>
            <span class="profile-card__hint">Задайте новый пароль или сбросьте на случайный</span>
          </div>
          <div class="profile-card__control profile-card__control--password">
            <input
              id="admin-user-new-password"
              v-model="newPassword"
              type="password"
              class="form-control form-control-sm profile-card__input"
              :class="{ 'is-invalid': passwordError }"
              placeholder="Новый пароль"
              autocomplete="new-password"
              :disabled="resetting"
            />
            <div class="profile-card__password-actions">
              <button
                type="button"
                class="btn btn-sm profile-card__action"
                :disabled="resetting"
                @click="handleManualSet"
              >
                <span v-if="resetting">...</span>
                <span v-else>Изменить</span>
              </button>
              <button
                type="button"
                class="btn btn-sm profile-card__action"
                :disabled="resetting"
                @click="requestSystemReset"
              >
                Сбросить
              </button>
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
            <button
              type="button"
              class="btn btn-sm profile-card__action"
              :disabled="resetting"
              @click="requestSystemReset"
            >
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
        class="btn btn-sm profile-card__action"
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
      Отображаются только активные сессии. Отзыв завершает вход на выбранном устройстве сразу.
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

.profile-card--stack {
  margin-bottom: 0;
}

.profile-card--sessions {
  margin-top: 0;
}

.profile-card__row {
  display: flex;
  align-items: center;
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

.profile-card__row--password {
  align-items: flex-start;
}

.profile-card__label {
  flex: 1 1 auto;
  font-size: 0.875rem;
  color: var(--color-primary-text);
  margin: 0;
}

.profile-card__label-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  max-width: 42%;
  flex: 1 1 auto;

  @media (width < $ui-bp-sm) {
    max-width: none;
  }
}

.profile-card__hint {
  font-size: 0.75rem;
  color: var(--color-secondary-text);
  opacity: 0.85;
  line-height: 1.35;
}

.profile-card__control {
  flex: 0 0 auto;
  min-width: 0;

  &--actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.375rem;
    width: auto;

    @media (width < $ui-bp-sm) {
      align-items: stretch;
      width: 100%;
    }
  }

  &--password {
    flex: 0 1 18rem;
    width: clamp(12rem, 48%, 18rem);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    @media (width < $ui-bp-sm) {
      width: 100%;
      flex: 1 1 auto;
    }
  }
}

.profile-card__input {
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: 1px solid var(--color-border);
  box-shadow: none;

  &::placeholder {
    color: var(--color-secondary-text);
    opacity: 0.75;
  }

  &:focus {
    outline: none;
    background: var(--color-hover-background);
    border-color: var(--color-border);
    box-shadow: none;
  }

  &.is-invalid {
    border-color: var(--bs-danger, #dc3545);
  }
}

.profile-card__password-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.375rem;
  flex-wrap: wrap;

  @media (width < $ui-bp-sm) {
    justify-content: stretch;

    .profile-card__action {
      flex: 1 1 auto;
    }
  }
}

.profile-card__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-weight: 400;
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
    color: var(--color-accent, #0d6efd);
    background: color-mix(in srgb, var(--color-accent, #0d6efd) 12%, transparent);
  }

  &--suspended {
    color: var(--color-secondary-text);
    background: var(--color-secondary-background);
  }
}

.sessions-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 1rem 0 0.375rem;
}

.sessions-block__caption {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-secondary-text, rgba(128, 128, 128, 0.95));
}

.sessions__list {
  display: flex;
  flex-direction: column;
}

.sessions__empty {
  text-align: center;
}

.sessions__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.625rem 1rem 0.75rem;
  border-top: 1px solid var(--color-border);
}

.sessions__pager {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.sessions__pager-btn {
  padding-left: 0.35rem;
  padding-right: 0.35rem;
  text-decoration: none;
  color: var(--color-primary-text);

  &:disabled {
    opacity: 0.45;
    pointer-events: none;
  }
}

.sessions__page-indicator {
  min-width: 3rem;
  text-align: center;
}

.sessions__disclaimer {
  font-size: 0.675rem;
  max-width: 36rem;
  line-height: 1.35;
}
</style>
