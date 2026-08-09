<script setup>
import { computed, ref, onMounted, watch, defineAsyncComponent } from 'vue'
import SelectBox from '@/components/SelectBox.vue'
import SettingsCard from '@/components/SettingsCard.vue'
import SettingsCardRow from '@/components/SettingsCardRow.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useProfile } from '@/core/cms/js/profileService.js'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import SessionCard from './SessionCard.vue'

const ChangePasswordModal = defineAsyncComponent(() => import('./ChangePasswordModal.vue'))

const { t } = useAppI18n()

const PROFILE_VISIBILITY_OPTIONS = computed(() => [
  { id: 'public', name: t('settings.security.visibilityPublic') },
  { id: 'friends', name: t('settings.security.visibilityFriends') },
  { id: 'private', name: t('settings.security.visibilityPrivate') },
])

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
    toast.error(t('settings.security.loadSessionsFailed'))
  } finally {
    loading.value = false
  }
}

const handleRevoke = async (id) => {
  if (deletingDeviceId.value != null) return

  const target = devices.value.find((device) => device.id === id)
  if (target?.isCurrent) {
    toast.warning(t('settings.security.cannotRevokeCurrent'))
    return
  }

  try {
    deletingDeviceId.value = id
    await deleteDevice(id)
    devices.value = devices.value.filter((device) => device.id !== id)
    toast.success(t('settings.security.sessionRevoked'))
    const maxPage = Math.max(1, Math.ceil(devices.value.length / PAGE_SIZE) || 1)
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage
    }
  } catch (error) {
    logError('Не удалось отозвать сессию', error)
    const message = error.response?.data?.error || t('settings.security.revokeFailed')
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
    <h1 class="settings-panel__title">{{ t('settings.security.title') }}</h1>

    <SettingsCard class="security-panel__stack">
      <SettingsCardRow :label="t('settings.security.privacy')" label-for="security-privacy">
        <SelectBox id="security-privacy" v-model="privacyLockedValue" :options="PROFILE_VISIBILITY_OPTIONS" :include-all-option="false" disabled/>
      </SettingsCardRow>

      <SettingsCardRow :label="t('settings.security.password')" :hint="t('settings.security.passwordHint')" control-size="auto" last>
        <button type="button" class="btn btn-sm profile-card__save" @click="showPasswordModal = true">
          {{ t('settings.security.changePasswordBtn') }}
        </button>
      </SettingsCardRow>
    </SettingsCard>

    <p class="sessions-block__caption">{{ t('settings.security.activeSessions') }}</p>
    <SettingsCard>
      <LoadingContentArea :loading="loading" min-height="6rem">
        <div v-if="paginationTotal === 0" class="sessions__empty text-muted small py-3 px-2">
          {{ t('settings.security.noSessions') }}
        </div>

        <div v-else class="sessions__list">
          <SessionCard v-for="device in rowsForPage" :key="device.id" :device="device" :revoking="deletingDeviceId === device.id" @revoke="handleRevoke"/>
        </div>

        <div v-if="paginationTotal > 0" class="sessions__footer">
          <span class="sessions__range text-muted small">
            {{ t('settings.security.shownRange', { from: paginationFrom, to: paginationTo, total: paginationTotal }) }}
          </span>
          <div class="sessions__pager">
            <button type="button" class="btn btn-link btn-sm sessions__pager-btn" :disabled="!canPrev" @click="goPrev">
              {{ t('settings.security.prev') }}
            </button>
            <span class="sessions__page-indicator small text-muted">{{ currentPage }} / {{ totalPages }}</span>
            <button type="button" class="btn btn-link btn-sm sessions__pager-btn" :disabled="!canNext" @click="goNext">
              {{ t('settings.security.next') }}
            </button>
          </div>
        </div>
      </LoadingContentArea>
    </SettingsCard>

    <p class="sessions__disclaimer text-muted small mt-2 mb-0">
      {{ t('settings.security.sessionsDisclaimer') }}
    </p>

    <ChangePasswordModal v-if="showPasswordModal" :show="showPasswordModal" @close="showPasswordModal = false"/>
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

.security-panel__stack {
  margin-bottom: 1rem;
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
