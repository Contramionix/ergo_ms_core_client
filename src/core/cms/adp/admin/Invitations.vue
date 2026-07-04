<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/js/utils/toast.js'
import {
  MailPlus,
  Copy,
  Mail,
  Ban,
  AlertCircle,
  FileSpreadsheet,
  ArrowLeft,
  Trash2,
} from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SelectBox from '@/components/SelectBox.vue'
import { runWithConfirm, confirmAction } from '@/js/utils/confirm.js'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import {
  fetchInvitations,
  revokeInvitation,
  resendInvitation,
  clearInvitations,
} from '@/core/cms/adp/admin/js/invitationService'
import { copyTextToClipboard } from '@/js/utils/clipboard.js'
import InvitationCreateModal from '@/core/cms/adp/admin/InvitationsComponents/InvitationCreateModal.vue'
import InvitationBulkModal from '@/core/cms/adp/admin/InvitationsComponents/InvitationBulkModal.vue'

const router = useRouter()
const toast = useToast()

const hasAdminAccess = ref(false)
const isCheckingAccess = ref(true)
const isLoading = ref(false)
const rows = ref([])
const totalItems = ref(0)
const totalAll = ref(0)
const inactiveCount = ref(0)
const pendingCount = ref(0)
const registrationMode = ref('open')
const currentPage = ref(1)
const rowsPerPage = ref(12)
const searchQuery = ref('')
const statusFilter = ref('all')

const showCreateModal = ref(false)
const showBulkModal = ref(false)

const STATUS_OPTIONS = [
  { id: 'all', name: 'Все статусы' },
  { id: 'pending', name: 'Ожидают' },
  { id: 'used', name: 'Использованы' },
  { id: 'expired', name: 'Истекли' },
  { id: 'revoked', name: 'Отозваны' },
]

const invitationModeEnabled = computed(() => registrationMode.value === 'invitation')
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / rowsPerPage.value)))

const listSummary = computed(() => {
  if (!totalItems.value && statusFilter.value === 'all' && !searchQuery.value.trim()) {
    return 'Нет приглашений'
  }

  const parts = [`Найдено: ${totalItems.value}`]
  if (totalPages.value > 1) {
    parts.push(`страница ${currentPage.value} из ${totalPages.value}`)
  }
  return parts.join(' · ')
})

const statusLabels = {
  pending: 'Ожидает',
  used: 'Использовано',
  expired: 'Истекло',
  revoked: 'Отозвано',
}

const statusClass = {
  pending: 'invitations-status--pending',
  used: 'invitations-status--used',
  expired: 'invitations-status--expired',
  revoked: 'invitations-status--revoked',
}

let searchDebounceTimer = null

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Статус', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'invited_by_name', label: 'Пригласил' },
  { key: 'created_at', label: 'Создано', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'expires_at', label: 'Действует до', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'actions', label: 'Действия', headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right' } },
]

const getItemKey = (item) => item.id

const formatDateTimeValue = (value) => {
  if (!value) return '—'
  return formatDateTime(value)
}

const loadInvitations = async () => {
  isLoading.value = true
  try {
    const data = await fetchInvitations({
      page: currentPage.value,
      page_size: rowsPerPage.value,
      search: searchQuery.value.trim() || undefined,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    })
    rows.value = data.invitations || []
    totalItems.value = data.total ?? rows.value.length
    totalAll.value = data.total_all ?? totalItems.value
    inactiveCount.value = data.inactive_count ?? 0
    pendingCount.value = data.pending_count ?? 0
    registrationMode.value = data.registration_mode || 'open'
    if (data.page) {
      currentPage.value = data.page
    }
  } catch (error) {
    logError('Ошибка загрузки приглашений:', error)
    toast.error('Не удалось загрузить список приглашений')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    const accessData = await CheckAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      router.push({ name: 'AccessDenied' })
      return
    }
    hasAdminAccess.value = true
    await loadInvitations()
  } catch (error) {
    logError('Ошибка проверки прав доступа:', error)
    toast.error('Ошибка проверки прав доступа')
    router.push({ name: 'AccessDenied' })
  } finally {
    isCheckingAccess.value = false
  }
})

const handlePageChange = (page) => {
  currentPage.value = page
  loadInvitations()
}

const handleSearchQuery = (query) => {
  searchQuery.value = query
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    if (currentPage.value !== 1) {
      currentPage.value = 1
    }
    loadInvitations()
  }, 300)
}

const handleStatusFilterChange = () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
  }
  loadInvitations()
}

const openCreateModal = () => {
  showCreateModal.value = true
}

const openBulkModal = () => {
  showBulkModal.value = true
}

const handleInvitationCreated = ({ sendEmail, emailWarning }) => {
  if (emailWarning) {
    toast.warning(`Приглашение создано, но письмо не отправлено: ${emailWarning}`)
  } else if (sendEmail) {
    toast.success('Приглашение создано и отправлено на email')
  } else {
    toast.success('Приглашение создано, ссылка скопирована в буфер обмена')
  }
  loadInvitations()
}

const handleBulkCompleted = () => {
  toast.success('Список приглашений обновлён')
  loadInvitations()
}

const copyInviteLink = async (item) => {
  if (item.status === 'revoked') {
    return
  }

  const inviteUrl = item.invite_url?.trim()
  if (!inviteUrl) {
    toast.error('Ссылка приглашения недоступна')
    return
  }

  try {
    await copyTextToClipboard(inviteUrl)
    toast.success('Ссылка скопирована')
  } catch {
    toast.error('Не удалось скопировать ссылку')
  }
}

const copyEmail = async (email) => {
  const normalizedEmail = email?.trim()
  if (!normalizedEmail) {
    return
  }

  try {
    await copyTextToClipboard(normalizedEmail)
    toast.success('Email скопирован')
  } catch {
    toast.error('Не удалось скопировать email')
  }
}

const handleResend = async (item) => {
  try {
    await resendInvitation(item.id)
    toast.success('Письмо с приглашением отправлено')
  } catch (error) {
    toast.error(error.response?.data?.error || 'Не удалось отправить письмо')
  }
}

const handleRevoke = async (item) => {
  const confirmed = await confirmAction({
    title: 'Отозвать приглашение',
    message: `Отозвать приглашение для ${item.email}?\n\nСсылка перестанет работать.`,
    confirmText: 'Отозвать',
    cancelText: 'Отмена',
    variant: 'danger',
  })
  if (!confirmed) {
    return
  }

  try {
    await revokeInvitation(item.id)
    toast.success('Приглашение отозвано')
    await loadInvitations()
  } catch (error) {
    toast.error(error.response?.data?.error || 'Не удалось отозвать приглашение')
  }
}

const goBack = () => {
  router.push({ name: 'UsersPanel' })
}

const openClearConfirm = async (scope) => {
  const options = {
    title: 'Очистка приглашений',
    confirmText: scope === 'all' ? 'Удалить все' : 'Удалить неактивные',
    variant: 'danger',
    message: scope === 'all'
      ? `Будут безвозвратно удалены все приглашения (${totalAll.value}).\n\nОжидающие ссылки перестанут работать.`
      : `Будут удалены использованные, истёкшие и отозванные приглашения (${inactiveCount.value}).\n\nОжидающие приглашения останутся.`,
  }

  await runWithConfirm(options, async () => {
    const result = await clearInvitations(scope)
    if (result.deleted > 0) {
      toast.success(`Удалено приглашений: ${result.deleted}`)
    } else {
      toast.info(result.message || 'Нет приглашений для удаления')
    }
    currentPage.value = 1
    await loadInvitations()
  })
}
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
    <SpinnerLoading color="primary" />
  </div>

  <div v-else-if="hasAdminAccess" class="admin-page">
    <div class="page-header">
      <h1 class="page-title">Управление приглашениями</h1>
      <p class="page-subtitle">
        Создавайте ссылки вручную или загружайте список email из Excel для массовой рассылки
      </p>
    </div>

    <div class="content-card">
      <button
        type="button"
        class="btn btn-primary d-inline-flex align-items-center gap-2 align-self-start"
        @click="goBack"
      >
        <ArrowLeft :size="16" />
        <span>К пользователям</span>
      </button>

      <div v-if="!invitationModeEnabled" class="invitations-notice">
        <AlertCircle :size="18" class="invitations-notice__icon" />
        <div>
          <strong>Режим регистрации по приглашениям не включён.</strong>
          <span class="invitations-notice__text">
            Включите его в настройках сервера, чтобы создавать и отправлять приглашения.
          </span>
        </div>
      </div>

      <div v-if="invitationModeEnabled" class="invitations-stats">
        <span class="invitations-stat">
          Всего в системе: <strong>{{ totalAll }}</strong>
        </span>
        <span class="invitations-stat">
          Ожидают: <strong>{{ pendingCount }}</strong>
        </span>
        <span v-if="inactiveCount > 0" class="invitations-stat">
          Неактивных: <strong>{{ inactiveCount }}</strong>
        </span>
      </div>

      <p v-if="invitationModeEnabled" class="invitations-summary">
        {{ listSummary }} · {{ rowsPerPage }} на странице
      </p>

      <div class="table-header invitations-toolbar">
        <div class="filters-wrapper">
          <div class="search-wrapper">
            <label for="invitations-search" class="form-label mb-1">Поиск</label>
            <input
              id="invitations-search"
              type="search"
              class="form-control search-input"
              placeholder="Email, примечание, кто пригласил..."
              @input="handleSearchQuery($event.target.value)"
            />
          </div>
          <div class="status-filter">
            <SelectBox
              id="invitations-status"
              v-model="statusFilter"
              label="Статус"
              :options="STATUS_OPTIONS"
              value-key="id"
              label-key="name"
              :include-all-option="false"
              fixed-trigger-label-font-size
              @update:model-value="handleStatusFilterChange"
            />
          </div>
        </div>

        <div class="actions-wrapper invitations-actions">
          <div class="invitations-actions__group invitations-actions__group--primary">
            <button
              type="button"
              class="btn btn-primary d-flex align-items-center gap-2"
              :disabled="!invitationModeEnabled"
              @click="openCreateModal"
            >
              <MailPlus :size="16" />
              <span>Одно приглашение</span>
            </button>
            <button
              type="button"
              class="btn btn-primary d-flex align-items-center gap-2"
              :disabled="!invitationModeEnabled"
              @click="openBulkModal"
            >
              <FileSpreadsheet :size="16" />
              <span>Загрузить из Excel</span>
            </button>
          </div>

          <div class="invitations-actions__group invitations-actions__group--secondary">
            <button
              type="button"
              class="btn btn-outline-secondary d-flex align-items-center gap-2"
              :disabled="!invitationModeEnabled || isLoading || inactiveCount === 0"
              title="Удалить использованные, истёкшие и отозванные приглашения"
              @click="openClearConfirm('inactive')"
            >
              <Trash2 :size="16" />
              <span>Очистить неактивные</span>
            </button>
            <button
              type="button"
              class="btn btn-outline-danger d-flex align-items-center gap-2"
              :disabled="!invitationModeEnabled || isLoading || totalAll === 0"
              title="Удалить все приглашения, включая ожидающие"
              @click="openClearConfirm('all')"
            >
              <Trash2 :size="16" />
              <span>Очистить все</span>
            </button>
          </div>
        </div>
      </div>

      <LoadingContentArea :loading="isLoading">
        <DataTable
          :items="rows"
          :columns="columns"
          :items-per-page="rowsPerPage"
          :current-page="currentPage"
          :total-items="totalItems"
          :get-item-key="getItemKey"
          :enable-pagination="true"
          @update:current-page="handlePageChange"
        >
        <template #cell-email="{ item }">
          <div class="invitations-email-cell">
            <div class="d-flex align-items-center gap-2">
              <span class="invitations-email-text">{{ item.email }}</span>
              <button
                type="button"
                class="btn-action"
                title="Скопировать email"
                aria-label="Скопировать email"
                @click.stop="copyEmail(item.email)"
              >
                <Copy :size="15" />
              </button>
            </div>
            <small v-if="item.note" class="invitations-email-note">{{ item.note }}</small>
          </div>
        </template>

        <template #cell-status="{ item }">
          <span class="invitations-status" :class="statusClass[item.status] || 'invitations-status--expired'">
            {{ statusLabels[item.status] || item.status }}
          </span>
        </template>

        <template #cell-invited_by_name="{ item }">
          {{ item.invited_by_name || '—' }}
        </template>

        <template #cell-created_at="{ item }">
          {{ formatDateTimeValue(item.created_at) }}
        </template>

        <template #cell-expires_at="{ item }">
          {{ formatDateTimeValue(item.expires_at) }}
        </template>

        <template #cell-actions="{ item }">
          <div class="actions-cell">
            <button
              type="button"
              class="btn-action"
              :disabled="item.status === 'revoked'"
              :title="item.status === 'revoked' ? 'Ссылка недоступна: приглашение отозвано' : 'Скопировать ссылку на регистрацию'"
              aria-label="Скопировать ссылку"
              @click.stop="copyInviteLink(item)"
            >
              <Copy :size="15" />
            </button>
            <button
              v-if="item.status === 'pending'"
              type="button"
              class="btn-action"
              title="Отправить письмо с приглашением"
              aria-label="Отправить письмо"
              @click.stop="handleResend(item)"
            >
              <Mail :size="15" />
            </button>
            <button
              v-if="item.status === 'pending'"
              type="button"
              class="btn-action btn-action--delete"
              title="Отозвать приглашение"
              aria-label="Отозвать приглашение"
              @click.stop="handleRevoke(item)"
            >
              <Ban :size="15" />
            </button>
          </div>
        </template>
        </DataTable>
      </LoadingContentArea>

      <InvitationCreateModal
        :visible="showCreateModal"
        :disabled="!invitationModeEnabled"
        @close="showCreateModal = false"
        @created="handleInvitationCreated"
      />

      <InvitationBulkModal
        :visible="showBulkModal"
        :disabled="!invitationModeEnabled"
        @close="showBulkModal = false"
        @completed="handleBulkCompleted"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: 400px;
}

.invitations-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid color-mix(in srgb, var(--bs-warning, #ffc107) 35%, var(--color-border));
  border-radius: 0.625rem;
  background: color-mix(in srgb, var(--bs-warning, #ffc107) 10%, var(--color-primary-background));
  color: var(--color-primary-text);

  &__icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
    color: var(--bs-warning-text-emphasis, #997404);
  }

  &__text {
    display: block;
    margin-top: 0.125rem;
    font-size: 0.8125rem;
    color: var(--color-secondary-text);
  }
}

.invitations-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
}

.invitations-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
  background: var(--color-secondary-background);

  strong {
    color: var(--color-primary-text);
    font-weight: 600;
  }
}

.invitations-summary {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}

.filters-wrapper {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  flex: 1 1 auto;
  min-width: 0;
}

.invitations-toolbar {
  align-items: flex-end;
}

.search-wrapper {
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
}

.search-wrapper .search-input {
  min-height: 38px;
}

.status-filter {
  flex: 0 1 220px;
  min-width: 180px;

  :deep(.select-box) {
    --select-box-font-size: 0.875rem;
  }
}

.invitations-actions {
  align-items: flex-end;
  flex-direction: column;
  gap: 0.5rem;

  @media (width >= 992px) {
    flex-direction: row;
    align-items: flex-end;
  }

  &__group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__group--primary,
  &__group--secondary {
    .btn {
      min-height: 38px;
    }
  }
}

.invitations-email-cell {
  min-width: 0;
}

.invitations-email-text {
  user-select: text;
  cursor: text;
  word-break: break-all;
  color: var(--color-primary-text);
}

.invitations-email-note {
  display: block;
  margin-top: 0.125rem;
  color: var(--color-secondary-text);
}

.invitations-status {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;

  &--pending {
    background: color-mix(in srgb, var(--color-accent, #0d6efd) 14%, transparent);
    color: var(--color-accent, #0d6efd);
  }

  &--used {
    background: color-mix(in srgb, var(--bs-success, #198754) 14%, transparent);
    color: var(--bs-success, #198754);
  }

  &--expired {
    background: var(--color-secondary-background);
    color: var(--color-secondary-text);
  }

  &--revoked {
    background: color-mix(in srgb, var(--bs-danger, #dc3545) 12%, transparent);
    color: var(--bs-danger, #dc3545);
  }
}
</style>
