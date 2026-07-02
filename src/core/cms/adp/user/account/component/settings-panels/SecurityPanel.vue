<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import SelectBox from '@/components/SelectBox.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import { useProfile } from '@/core/cms/js/profileService.js'
import ChangePasswordModal from './ChangePasswordModal.vue'
import SessionCard from './SessionCard.vue'

const PROFILE_VISIBILITY_OPTIONS = [
  { id: 'public', name: 'Публичный' },
  { id: 'friends', name: 'Только друзья' },
  { id: 'private', name: 'Приватный' },
]

const PAGE_SIZE = 5

const toast = useToast()
const { getDevices, deleteDevice, formatDeviceData } = useProfile()

const privacyLockedValue = ref('private')
const showPasswordModal = ref(false)

const loading = ref(true)
const devices = ref([])
const deletingDeviceId = ref(null)
const currentPage = ref(1)

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

const fetchDevices = async () => {
  try {
    loading.value = true
    const response = await getDevices()
    devices.value = response.map((device) => formatDeviceData(device))
  } catch (error) {
    logError('Не удалось загрузить сессии', error)
    toast.error('Не удалось загрузить сессии')
  } finally {
    loading.value = false
  }
}

const handleRevoke = async (id) => {
  if (deletingDeviceId.value != null) return

  const target = devices.value.find((device) => device.id === id)
  if (target?.isCurrent) {
    toast.warning('Нельзя завершить текущую сессию')
    return
  }

  try {
    deletingDeviceId.value = id
    await deleteDevice(id)
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

const goPrev = () => {
  if (canPrev.value) currentPage.value -= 1
}

const goNext = () => {
  if (canNext.value) currentPage.value += 1
}

watch(
  () => [paginationTotal.value, devices.value.length],
  () => {
    const total = devices.value.length
    const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)
    if (currentPage.value > maxPage) currentPage.value = maxPage
  },
)

onMounted(() => {
  fetchDevices()
})
</script>

<template>
  <div class="settings-panel">
    <h1 class="settings-panel__title">Безопасность</h1>

    <div class="settings-card settings-card--stack">
      <div class="settings-card__row">
        <label class="settings-card__label" for="security-privacy">Приватность профиля</label>
        <div class="settings-card__control">
          <SelectBox id="security-privacy" v-model="privacyLockedValue" :options="PROFILE_VISIBILITY_OPTIONS" :include-all-option="false" disabled fixed-trigger-label-font-size />
        </div>
      </div>

      <div class="settings-card__row settings-card__row--last">
        <div class="settings-card__label-block">
          <span class="settings-card__label">Пароль</span>
          <span class="settings-card__hint">Смена пароля в отдельном окне</span>
        </div>
        <div class="settings-card__control settings-card__control--actions">
          <button type="button" class="btn btn-sm profile-card__save" @click="showPasswordModal = true">
            Изменить пароль
          </button>
        </div>
      </div>
    </div>

    <p class="sessions-block__caption">Активные сессии</p>
    <div class="settings-card settings-card--sessions">
      <div v-if="loading" class="sessions__loading">
        <SpinnerLoading color="primary" />
      </div>
      <template v-else>
        <div v-if="paginationTotal === 0" class="sessions__empty text-muted small py-3 px-2">
          Нет активных сессий
        </div>

        <div v-else class="sessions__list">
          <SessionCard
            v-for="device in rowsForPage"
            :key="device.id"
            :device="device"
            :revoking="deletingDeviceId === device.id"
            @revoke="handleRevoke"
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
      </template>
    </div>

    <p class="sessions__disclaimer text-muted small mt-2 mb-0">
      Отображаются только активные сессии. Отзыв завершает вход на выбранном устройстве сразу.
    </p>

    <ChangePasswordModal :show="showPasswordModal" @close="showPasswordModal = false" />
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

.settings-card {
  width: 100%;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  overflow: hidden;
}

.settings-card--stack {
  margin-bottom: 1rem;
}

.settings-card__row {
  display: flex;
  align-items: center;
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

.settings-card__row--last {
  border-bottom: none;
}

.settings-card__label {
  flex: 1 1 auto;
  font-size: 0.875rem;
  color: var(--color-primary-text);
  margin: 0;
}

.settings-card__label-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.settings-card__hint {
  font-size: 0.75rem;
  color: var(--color-secondary-text);
  opacity: 0.85;
}

.settings-card__control {
  flex: 0 0 auto;
  width: clamp(11rem, 50%, 14rem);
  min-width: 0;

  @media (max-width: 575.98px) {
    width: 100%;
  }

  &--actions {
    width: auto;
    flex-shrink: 0;
  }

  :deep(.select-box) {
    --select-box-font-size: 0.8125rem;
    --select-box-icon-size: 14px;
    --select-box-trigger-min-height: 30px;
    --select-box-item-padding-y: 0.25rem;
    --select-box-item-padding-x: 0.5rem;
  }

  :deep(.select-trigger) {
    line-height: 1.2;
  }
}

.profile-card__save {
  display: inline-flex;
  align-items: center;
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

.sessions-block__caption {
  margin: 0 0 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-secondary-text, rgba(128, 128, 128, 0.95));
}

.settings-card--sessions {
  padding: 0;
}

.sessions__loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

.sessions__list {
  display: flex;
  flex-direction: column;
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

.sessions__empty {
  text-align: center;
}

.sessions__disclaimer {
  font-size: 0.675rem;
  max-width: 36rem;
}
</style>
